import { expect, test } from "@playwright/test";

test("uses Chinese by default and persists an explicit English choice", async ({
  page,
  context,
}) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("link", { name: /新建研究/ })).toBeVisible();

  await page.getByRole("button", { name: "语言选项" }).click();
  await expect(page).toHaveURL(/\/en\/workspace$/);
  await expect(page.getByRole("link", { name: /NEW RESEARCH/ })).toBeVisible();

  await expect
    .poll(async () => {
      const cookie = (await context.cookies()).find(
        (item) => item.name === "RESEARCH_AGENT_LOCALE",
      );
      return cookie?.value;
    })
    .toBe("en");

  await page.getByRole("button", { name: "Languages" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("link", { name: /新建研究/ })).toBeVisible();

  await page.getByRole("link", { name: /新建研究/ }).click();
  await expect(page).toHaveURL(/\/research\/new$/);
  await expect(page.getByLabel("研究问题")).toBeVisible();
  await page.getByRole("button", { name: "语言选项" }).click();
  await expect(page).toHaveURL(/\/en\/research\/new$/);
  await expect(page.getByLabel("Research question")).toBeVisible();
});
