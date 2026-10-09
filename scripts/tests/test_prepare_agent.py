"""Exercise the real Windows bootstrap and BAT with offline runtime stubs.

Run without backend dependencies: python -m unittest discover -s scripts/tests -v
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[2]
POWERSHELL = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"

# A tiny executable stands in for py.exe, node.exe, and the venv's python.exe.
# The actual PowerShell script still performs all discovery, hashing, and I/O.
RUNTIME_STUB = r'''
using System;
using System.IO;
using System.Reflection;
class RuntimeStub {
    static int Main(string[] args) {
        string executable = Assembly.GetExecutingAssembly().Location;
        string tool = Path.GetFileNameWithoutExtension(executable);
        File.AppendAllText(Environment.GetEnvironmentVariable("SETUP_TEST_LOG"),
            tool + "\t" + String.Join("\t", args) + Environment.NewLine);
        string failure = Environment.GetEnvironmentVariable("SETUP_TEST_FAIL");
        if (tool == "node") {
            Console.WriteLine(Environment.GetEnvironmentVariable("SETUP_TEST_NODE_VERSION") ?? "v24.14.0");
            return 0;
        }
        if (args.Length > 0 && args[0] == "__npm__") {
            if (failure == "npm") return 23;
            int prefix = Array.IndexOf(args, "--prefix");
            string bin = Path.Combine(args[prefix + 1], "node_modules", ".bin");
            Directory.CreateDirectory(bin);
            File.WriteAllText(Path.Combine(bin, "next.cmd"), "@echo off\r\n");
            return 0;
        }
        int module = Array.IndexOf(args, "-m");
        if (module >= 0 && args[module + 1] == "venv") {
            if (failure == "venv") return 24;
            string scripts = Path.Combine(args[module + 2], "Scripts");
            Directory.CreateDirectory(scripts);
            File.Copy(executable, Path.Combine(scripts, "python.exe"), true);
            if (failure == "partial-venv") return 24;
        }
        if (module >= 0 && args[module + 1] == "ensurepip" && failure == "ensurepip") return 26;
        if (module >= 0 && args[module + 1] == "pip" && failure == "pip") return 25;
        return 0;
    }
}
'''


def powershell_literal(value):
    return "'" + str(value).replace("'", "''") + "'"


@unittest.skipUnless(os.name == "nt", "Windows launchers")
class PrepareAgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime_directory = tempfile.TemporaryDirectory(prefix="research-bootstrap-runtime-")
        cls.runtime = Path(cls.runtime_directory.name)
        source = cls.runtime / "runtime.cs"
        source.write_text(RUNTIME_STUB, encoding="utf-8")
        compile_script = cls.runtime / "compile.ps1"
        compile_script.write_text(
            "$ErrorActionPreference = 'Stop'\n"
            f"Add-Type -Path {powershell_literal(source)} "
            f"-OutputAssembly {powershell_literal(cls.runtime / 'py.exe')} "
            "-OutputType ConsoleApplication\n",
            encoding="utf-8",
        )
        result = subprocess.run(
            [str(POWERSHELL), "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(compile_script)],
            capture_output=True, timeout=30,
        )
        if result.returncode:
            raise AssertionError(result.stdout.decode(errors="replace") + result.stderr.decode(errors="replace"))

    @classmethod
    def tearDownClass(cls):
        cls.runtime_directory.cleanup()

    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="research-bootstrap-test-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name) / "项目 空格's [bootstrap]"
        self.scripts = self.root / "scripts"
        self.web = self.root / "web"
        self.scripts.mkdir(parents=True)
        self.web.mkdir()
        shutil.copyfile(REPO / "scripts/prepare_agent.ps1", self.scripts / "prepare_agent.ps1")
        shutil.copyfile(REPO / "ResearchAgent-启动.bat", self.root / "ResearchAgent-启动.bat")
        (self.root / "requirements.txt").write_text("example-package>=1\n", encoding="utf-8")
        (self.web / "package.json").write_text('{"name":"bootstrap-test"}\n', encoding="utf-8")
        (self.web / "package-lock.json").write_text('{"lockfileVersion":3}\n', encoding="utf-8")
        (self.root / ".env.example").write_text("EXAMPLE_VALUE=template\n", encoding="utf-8")
        # Keep service startup observable without launching servers or a database.
        (self.scripts / "start_agent.ps1").write_text(
            "Set-Content -LiteralPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'service-started.txt') "
            "-Value $env:PYTHON_EXE\nexit 0\n", encoding="utf-8",
        )
        self.tools = self.root / "tools"
        self.tools.mkdir()
        for name in ("py.exe", "node.exe"):
            shutil.copyfile(self.runtime / "py.exe", self.tools / name)
        (self.tools / "npm.cmd").write_text(
            '@echo off\r\n"%~dp0py.exe" __npm__ %*\r\nexit /b %ERRORLEVEL%\r\n', encoding="ascii",
        )
        self.log = self.root / "calls.txt"
        # Python inherits the host's PowerShell 7 module path. Let the Windows
        # PowerShell child build its own default path, as it does from Explorer.
        self.environment = {
            **{key: value for key, value in os.environ.items() if key.upper() != "PSMODULEPATH"},
            "PATH": str(self.tools) + os.pathsep + str(POWERSHELL.parent),
            "SETUP_TEST_LOG": str(self.log),
            "SETUP_TEST_FAIL": "",
        }
        self.python_stamp = self.root / ".venv/.research-agent-requirements.sha256"
        self.frontend_stamp = self.web / "node_modules/.research-agent-dependencies.sha256"

    def prepare(self, *, succeeds=True):
        result = subprocess.run(
            [str(POWERSHELL), "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(self.scripts / "prepare_agent.ps1")],
            env=self.environment, capture_output=True, timeout=30,
        )
        output = result.stdout.decode(errors="replace") + result.stderr.decode(errors="replace")
        self.assertEqual(result.returncode, 0 if succeeds else 1, output)
        return output

    def calls(self, argument):
        lines = self.log.read_text(encoding="utf-8").splitlines() if self.log.exists() else []
        return [line for line in lines if argument in line.split("\t")]

    def test_first_setup_then_repeat_skips_installation(self):
        self.prepare()
        self.assertTrue((self.root / ".venv/Scripts/python.exe").is_file())
        self.assertTrue(self.python_stamp.is_file())
        self.assertTrue(self.frontend_stamp.is_file())
        self.assertEqual((self.root / ".env").read_bytes(), (self.root / ".env.example").read_bytes())
        self.prepare()
        for argument in ("venv", "pip", "__npm__"):
            self.assertEqual(len(self.calls(argument)), 1)

    def test_changed_manifests_reinstall_only_the_affected_dependencies(self):
        self.prepare()
        (self.root / "requirements.txt").write_text("example-package>=2\n", encoding="utf-8")
        self.prepare()
        self.assertEqual(len(self.calls("pip")), 2)
        self.assertEqual(len(self.calls("__npm__")), 1)
        for manifest in ("package.json", "package-lock.json"):
            with self.subTest(manifest=manifest):
                with (self.web / manifest).open("a", encoding="utf-8") as target:
                    target.write("\n")
                self.prepare()
        self.assertEqual(len(self.calls("pip")), 2)
        self.assertEqual(len(self.calls("__npm__")), 3)

    def test_missing_next_command_repairs_frontend(self):
        self.prepare()
        (self.web / "node_modules/.bin/next.cmd").unlink()
        self.prepare()
        self.assertEqual(len(self.calls("__npm__")), 2)
        self.assertEqual(len(self.calls("pip")), 1)

    def test_existing_environment_file_is_preserved(self):
        original = b"EXAMPLE_VALUE=user-setting\r\n"
        (self.root / ".env").write_bytes(original)
        self.prepare()
        self.assertEqual((self.root / ".env").read_bytes(), original)

    def test_python_install_failure_leaves_no_stamp_and_retry_succeeds(self):
        self.environment["SETUP_TEST_FAIL"] = "pip"
        self.assertIn("Python dependency installation failed", self.prepare(succeeds=False))
        self.assertFalse(self.python_stamp.exists())
        self.assertEqual(self.calls("__npm__"), [])
        self.environment["SETUP_TEST_FAIL"] = ""
        self.prepare()
        self.assertEqual(len(self.calls("pip")), 2)
        self.assertTrue(self.python_stamp.exists())

    def test_frontend_install_failure_retries_without_reinstalling_python(self):
        self.environment["SETUP_TEST_FAIL"] = "npm"
        self.assertIn("Frontend dependency installation failed", self.prepare(succeeds=False))
        self.assertTrue(self.python_stamp.exists())
        self.assertFalse(self.frontend_stamp.exists())
        self.environment["SETUP_TEST_FAIL"] = ""
        self.prepare()
        self.assertEqual(len(self.calls("pip")), 1)
        self.assertEqual(len(self.calls("__npm__")), 2)

    def test_venv_creation_failure_stops_installation(self):
        self.environment["SETUP_TEST_FAIL"] = "venv"
        self.assertIn("Virtual environment creation failed", self.prepare(succeeds=False))
        self.assertEqual(self.calls("pip"), [])
        self.assertEqual(self.calls("__npm__"), [])

    def test_interrupted_venv_creation_can_be_retried(self):
        self.environment["SETUP_TEST_FAIL"] = "partial-venv"
        self.prepare(succeeds=False)
        self.assertTrue((self.root / ".venv/Scripts/python.exe").is_file())
        self.environment["SETUP_TEST_FAIL"] = ""
        self.prepare()
        self.assertEqual(len(self.calls("ensurepip")), 1)
        self.assertTrue(self.python_stamp.exists())

    def test_pip_bootstrap_failure_stops_installation_and_can_be_retried(self):
        self.environment["SETUP_TEST_FAIL"] = "ensurepip"
        self.assertIn("Could not prepare pip", self.prepare(succeeds=False))
        self.assertFalse(self.python_stamp.exists())
        self.assertEqual(self.calls("pip"), [])
        self.environment["SETUP_TEST_FAIL"] = ""
        self.prepare()
        self.assertTrue(self.python_stamp.exists())

    def test_missing_prerequisites_fail_before_installation(self):
        for name, message in (("node.exe", "Node.js/npm was not found"), ("py.exe", "Python 3.11 or newer was not found")):
            with self.subTest(name=name):
                executable = self.tools / name
                renamed = executable.with_suffix(".disabled")
                executable.rename(renamed)
                try:
                    self.assertIn(message, self.prepare(succeeds=False))
                    self.assertFalse((self.root / ".venv").exists())
                finally:
                    renamed.rename(executable)

    def test_old_node_version_fails_before_installation(self):
        self.environment["SETUP_TEST_NODE_VERSION"] = "v20.8.1"
        self.assertIn("requires Node.js 20.9 or newer", self.prepare(succeeds=False))
        self.assertFalse((self.root / ".venv").exists())

    def test_bat_starts_services_only_after_successful_setup(self):
        bat = self.root / "ResearchAgent-启动.bat"
        command = [os.environ.get("COMSPEC", r"C:\Windows\System32\cmd.exe"), "/d", "/c", str(bat)]
        self.environment["SETUP_TEST_FAIL"] = "pip"
        result = subprocess.run(command, env=self.environment, input=b"\r\n", capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        started = self.root / "service-started.txt"
        self.assertFalse(started.exists())
        self.environment["SETUP_TEST_FAIL"] = ""
        result = subprocess.run(command, env=self.environment, input=b"\r\n", capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue(started.is_file())


if __name__ == "__main__":
    unittest.main()
