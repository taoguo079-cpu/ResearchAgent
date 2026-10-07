from types import SimpleNamespace

import pytest

import backend.agents.filter as filter_module


def test_parse_scores_accepts_objects_arrays_and_code_blocks() -> None:
    assert filter_module._parse_scores('{"scores":[{"paper_num":1,"score":4}]}')[0][
        "score"
    ] == 4
    assert filter_module._parse_scores('[{"paper_num":2,"score":3}]')[0][
        "paper_num"
    ] == 2
    assert filter_module._parse_scores('```json\n{"scores": []}\n```') == []


def test_deterministic_score_uses_english_retrieval_terms() -> None:
    score, reason = filter_module._deterministic_score(
        {
            "title": "Retrieval augmented generation for factual question answering",
            "abstract": "A study of retrieval grounding.",
            "pdf_url": "https://example.test/paper.pdf",
        },
        query="知识密集型问答",
        retrieval_queries=["retrieval augmented generation factuality question answering"],
    )

    assert score >= 4
    assert "retrieval" in reason.lower()


@pytest.mark.asyncio
async def test_invalid_model_scores_use_deterministic_readable_fallback(monkeypatch) -> None:
    class FakeCompletions:
        async def create(self, **_kwargs):
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="not json"))]
            )

    class FakeClient:
        def __init__(self, **_kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setattr(filter_module, "AsyncOpenAI", FakeClient)

    result = await filter_module.filter_papers(
        {
            "user_query": "知识密集型问答",
            "research_plan": [
                {"retrieval_query": "retrieval augmented generation question answering"}
            ],
            "output_language": "zh-CN",
            "max_papers": 2,
            "raw_papers": [
                {
                    "paper_id": "paper-1",
                    "title": "Retrieval augmented generation for question answering",
                    "abstract": "Grounding with retrieval.",
                    "source": "arxiv",
                    "pdf_url": "https://example.test/1.pdf",
                },
                {
                    "paper_id": "paper-2",
                    "title": "Long context language models for question answering",
                    "abstract": "A comparison with retrieval augmented generation.",
                    "source": "semantic_scholar",
                    "pdf_url": "https://example.test/2.pdf",
                },
                {
                    "paper_id": "paper-3",
                    "title": "Unrelated manufacturing process study",
                    "abstract": "",
                    "source": "crossref",
                    "pdf_url": "",
                },
            ],
        }
    )

    assert [paper["paper_id"] for paper in result["selected_papers"]] == [
        "paper-1",
        "paper-2",
    ]
    assert "FILTER_FALLBACK_USED" in result["warnings"]


@pytest.mark.asyncio
@pytest.mark.parametrize("finish_reason", ["length", "stop"])
async def test_failed_readable_batch_is_not_hidden_by_metadata_only_scores(monkeypatch, finish_reason):
    async def create(**kwargs):
        readable = "Actual neutrino abstract" in kwargs["messages"][-1]["content"]
        first = 4 if "[4]" in kwargs["messages"][-1]["content"] else 1
        import json
        return SimpleNamespace(choices=[SimpleNamespace(
            finish_reason=finish_reason if readable else "stop",
            message=SimpleNamespace(content="" if readable else json.dumps({"scores": [
                {"paper_num": n, "score": 5} for n in range(first, first + 3)]})),
        )])
    monkeypatch.setattr(filter_module, "AsyncOpenAI", lambda **kwargs: SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))))
    papers = [
        {"paper_id": f"readable-{i}", "title": "Neutrino mass theory", "source": "arxiv",
         "abstract": "Actual neutrino abstract"} for i in range(3)
    ] + [
        {"paper_id": f"metadata-{i}", "title": "Neutrino theory", "source": "crossref",
         "abstract": None, "pdf_url": None} for i in range(3)
    ]
    result = await filter_module.filter_papers({"user_query": "中微子的前沿理论", "max_papers": 3,
        "raw_papers": papers, "research_plan": [{"retrieval_query": "neutrino mass theory"}]})
    assert any(p["paper_id"].startswith("readable-") for p in result["selected_papers"])
    assert "FILTER_FALLBACK_USED" in result["warnings"]
    if finish_reason == "length":
        assert "FILTER_MODEL_TRUNCATED" in result["warnings"]


@pytest.mark.asyncio
async def test_each_batch_uses_local_numbers_and_recovers_omitted_scores(monkeypatch):
    prompts = []
    async def create(**kwargs):
        prompts.append(kwargs["messages"][-1]["content"])
        return SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop",
            message=SimpleNamespace(content='{"scores":[{"paper_num":1,"score":5}]}'))])
    monkeypatch.setattr(filter_module, "AsyncOpenAI", lambda **kwargs: SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))))
    papers = [{"paper_id": f"p-{i}", "title": "Neutrino mass theory", "source": "arxiv",
               "abstract": "Neutrino mass theory evidence"} for i in range(6)]
    result = await filter_module.filter_papers({"user_query": "neutrino mass theory",
        "raw_papers": papers, "max_papers": 3})
    assert len(result["selected_papers"]) == 3
    assert any(p["paper_id"] == "p-3" for p in result["selected_papers"])
    assert "FILTER_FALLBACK_USED" in result["warnings"]
    assert all("[1]" in prompt and "[4]" not in prompt for prompt in prompts)
