// English and Turkish: picking a language, and Finely remembering it

import { expect, test } from "./test";
import { query } from "./db";
import { PASSWORD, uniqueEmail } from "./helpers";

test.describe("a browser that asks for Turkish", () => {
  test.use({ locale: "tr-TR" });

  test("gets the site in Turkish, and can switch to English for good", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(
      page.getByRole("heading", { name: "Modern işletmeler için finansal netlik." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "English" }).click();
    await expect(
      page.getByRole("heading", { name: "Financial clarity for modern businesses." }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Remembered: the next page is in English too
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "One clear view of your company's money",
    );
  });

  test("signs up in Turkish, and the account keeps that language", async ({ page }) => {
    const email = uniqueEmail("Ayse");
    await page.goto("/signup");
    await page.getByLabel("Ad soyad").fill("Ayşe Yılmaz");
    await page.getByLabel("İş e-postası").fill(email);
    await page.getByLabel("Şifre", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Hesap oluştur" }).click();

    await expect(page.getByRole("heading", { name: "Şirketinizi kurun" })).toBeVisible();
    await page.getByLabel("Şirket adı").fill("Kuzey Tasarım");
    await page.getByRole("button", { name: "Devam et" }).click();
    await expect(page.getByRole("heading", { name: "Genel Bakış" })).toBeVisible();

    // Saved for the emails Finely sends later, and its categories are Turkish
    const [person] = await query<{ locale: string }>(`select locale from "user" where email = $1`, [
      email,
    ]);
    expect(person.locale).toBe("tr");
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Yazılım ve BT").first()).toBeVisible();
  });
});

test("the demo, in Turkish: words, numbers and dates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Türkçe" }).click();
  await page.getByRole("button", { name: "Demoyu dene" }).click();
  await expect(page.getByRole("heading", { name: "Genel Bakış" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Bir demoyu inceliyorsunuz.")).toBeVisible();

  // Turkish number format: thousands with dots, cents after a comma
  await page.goto("/dashboard/transactions?q=Acme");
  await expect(page.getByRole("row").filter({ hasText: "+$7.500,00" }).first()).toBeVisible();

  await page.goto("/dashboard/bills");
  await expect(page.getByText("Hiscox işyeri sigortası")).toBeVisible();

  // The activity log is written in the reader's language
  await page.goto("/dashboard/settings");
  await page.getByLabel("Şirket adı", { exact: true }).fill("Northpeak Stüdyo");
  await page.getByRole("button", { name: "Kaydet" }).first().click();
  await expect(page.getByText("Şirketin adı artık Northpeak Stüdyo.")).toBeVisible();
  await page.goto("/dashboard/settings/activity");
  await expect(page.getByRole("heading", { name: "Etkinlik kaydı" })).toBeVisible();
  await expect(
    page.getByText("Şirketin adını “Northpeak Stüdyo” olarak değiştirdi"),
  ).toBeVisible();

  // Back to English from the top bar
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible();
});
