import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    Intl,
    URL,
    exports: module.exports,
    module,
    require: (id) => {
      if (id.startsWith("@/")) return {};
      if (id.startsWith(".")) {
        const localPath = path.resolve(path.dirname(filename), id);
        const localTsPath = fs.existsSync(localPath) ? localPath : `${localPath}.ts`;
        return loadTsModule(localTsPath);
      }
      return nodeRequire(id);
    }
  }, { filename });

  return module.exports;
}

test("marketing registry defines the approved anchors in order", () => {
  const { marketingSections } = loadTsModule("src/lib/marketing/navigation.ts");

  assert.equal(JSON.stringify(marketingSections.map((item) => item.id)), JSON.stringify(["cum-functioneaza", "pentru-cine", "ce-primesti", "preturi", "intrebari"]));
  assert.equal(JSON.stringify(marketingSections.map((item) => item.href)), JSON.stringify(["#cum-functioneaza", "#pentru-cine", "#ce-primesti", "#preturi", "#intrebari"]));
  assert.equal(JSON.stringify(marketingSections.map((item) => item.label)), JSON.stringify(["Cum funcționează", "Pentru cine", "Ce primești", "Prețuri", "Întrebări"]));
});

test("landing page uses centralized navigation and truthful pricing/copy", () => {
  const page = fs.readFileSync(path.resolve("src/app/(marketing)/page.tsx"), "utf8");
  const nav = fs.readFileSync(path.resolve("src/components/marketing/MarketingNav.tsx"), "utf8");
  const plans = fs.readFileSync(path.resolve("src/lib/billing/plans.ts"), "utf8");

  assert.equal(nav.includes("marketingSections.map"), true);
  assert.equal(page.includes("marketingSections.map"), true);
  assert.equal(page.includes('id="cum-functioneaza"'), true);
  assert.equal(page.includes('id="pentru-cine"'), true);
  assert.equal(page.includes('id="ce-primesti"'), true);
  assert.equal(page.includes('id="preturi"'), true);
  assert.equal(page.includes('id="intrebari"'), true);
  assert.equal(plans.includes('price: "490 EUR"'), true);
  assert.equal(plans.includes('price: "690 EUR"'), true);
  assert.equal(plans.includes("de la 690"), false);
  assert.equal(page.includes("mt-auto pt-6"), true, "pricing CTA region must be pinned to the bottom structurally");
  assert.equal(page.includes("FAQPage"), false);
  assert.equal(page.includes("fake"), false);
});

test("FAQ accordions are grouped and button based", () => {
  const source = fs.readFileSync(path.resolve("src/components/marketing/FaqAccordion.tsx"), "utf8");

  assert.equal(source.includes("type=\"button\""), true);
  assert.equal(source.includes("aria-expanded"), true);
  assert.equal(source.includes("aria-controls"), true);
  assert.equal(source.includes("role=\"region\""), true);
  assert.equal(source.includes("categories.map"), true);
});

test("shared validation accepts international names and locality values", () => {
  const validation = loadTsModule("src/lib/forms/validation.ts");

  assert.equal(validation.validatePersonName("  Ana-Maria Popescu  ").value, "Ana-Maria Popescu");
  assert.equal(validation.validatePersonName("Łukasz O'Connor").ok, true);
  assert.equal(validation.validateLocality("București").ok, true);
  assert.equal(validation.validateLocality("München").ok, true);
  assert.equal(validation.validateLocality("São Paulo").ok, true);
  assert.equal(validation.validateLocality("Łódź").ok, true);
  assert.equal(validation.validateLocality("東京").ok, true);
  assert.equal(validation.validateLocality("https://example.com").ok, false);
  assert.equal(validation.validateLocality("city@example.com").ok, false);
});

test("country options are deterministic and hydration-safe", () => {
  const validation = loadTsModule("src/lib/forms/validation.ts");
  const source = fs.readFileSync(path.resolve("src/lib/forms/validation.ts"), "utf8");
  const countrySource = fs.readFileSync(path.resolve("src/lib/forms/country-options.ts"), "utf8");
  const onboardingSource = fs.readFileSync(path.resolve("src/components/onboarding/OnboardingForm.tsx"), "utf8");

  const options = validation.countryOptions;
  const codes = options.map((country) => country.code);
  const uniqueCodes = new Set(codes);
  const secondRead = loadTsModule("src/lib/forms/validation.ts").countryOptions;

  assert.equal(options.length > 200, true);
  assert.equal(uniqueCodes.size, options.length, "country codes must be unique");
  assert.equal(JSON.stringify(codes), JSON.stringify([...codes].sort()), "country options must stay sorted by ISO alpha-2 code");
  assert.equal(JSON.stringify(secondRead.map((country) => country.code)), JSON.stringify(codes), "module reload must preserve option order");
  assert.equal(validation.countryName("FK"), "Insulele Falkland (Insulele Malvine)");
  assert.equal(options.find((country) => country.code === "FK")?.label, "Insulele Falkland (Insulele Malvine)");
  assert.equal(options.find((country) => country.code === "RO")?.label, "România");
  assert.equal(options.find((country) => country.code === "RO")?.callingCode, "+40");
  assert.equal(source.includes("Intl.DisplayNames"), false, "validation must not generate initial labels with Intl.DisplayNames");
  assert.equal(countrySource.includes("Intl.DisplayNames"), false, "country option source must be static data");
  assert.equal(onboardingSource.includes("suppressHydrationWarning"), false, "onboarding must not suppress hydration warnings");
  assert.equal(onboardingSource.includes('value={draft.countryCode}'), true, "country selection must persist by ISO code");
  assert.equal(onboardingSource.includes('value={country.code}'), true, "country option values must be ISO codes");
  assert.equal(onboardingSource.includes('draft.countryCode === "RO"'), true, "Romanian-only CUI behavior must remain tied to ISO code");
  assert.equal(onboardingSource.includes('cui: value === "RO" ? current.cui : ""'), true, "leaving Romania must clear CUI state");
});

test("Romanian administrative areas are canonical and locality is validated text", () => {
  const validation = loadTsModule("src/lib/forms/validation.ts");
  const countySource = fs.readFileSync(path.resolve("src/lib/forms/ro-counties.ts"), "utf8");

  const countyOptions = validation.getAdministrativeAreaOptions("RO");
  const countyCodes = countyOptions.map((county) => county.value);
  const countyLabels = countyOptions.map((county) => county.label);

  assert.equal(countyOptions.length, 42, "Romania must include 41 counties plus București");
  assert.equal(new Set(countyCodes).size, 42, "Romanian county codes must be unique");
  assert.equal(new Set(countyLabels).size, 42, "Romanian county labels must be unique");
  assert.equal(JSON.stringify(countyOptions.find((county) => county.value === "RO-PH")), JSON.stringify({ value: "RO-PH", label: "Prahova" }));
  assert.equal(JSON.stringify(countyOptions.find((county) => county.value === "RO-B")), JSON.stringify({ value: "RO-B", label: "București" }));
  assert.equal(JSON.stringify(countyOptions.find((county) => county.value === "RO-CJ")), JSON.stringify({ value: "RO-CJ", label: "Cluj" }));
  assert.equal(validation.validateAdministrativeArea("", "RO").ok, false);
  assert.equal(validation.validateAdministrativeArea("MA TA", "RO").ok, false);
  assert.equal(validation.validateAdministrativeArea("Prahova", "RO").ok, false);
  assert.equal(validation.validateAdministrativeArea("RO-XX", "RO").ok, false);
  assert.equal(validation.validateAdministrativeArea("RO-PH", "RO").label, "Prahova");

  assert.equal(validation.validateLocality(" Ploiești  ").value, "Ploiești");
  assert.equal(validation.validateLocality("Fundulea").ok, true);
  assert.equal(validation.validateLocality("București").ok, true);
  assert.equal(validation.validateLocality("Cluj-Napoca").ok, true);
  assert.equal(validation.validateLocality("東京").ok, true);
  assert.equal(validation.validateLocality("https://example.com").ok, false);
  assert.equal(validation.validateLocality("city@example.com").ok, false);
  assert.equal(validation.validateLocality("<script>alert(1)</script>").ok, false);
  assert.equal(validation.validateLocality("A\u0000B").ok, false);
  assert.equal(validation.validateLocality("   ").ok, false);
  assert.equal(validation.validateLocality("!!!").ok, false);
  assert.equal(validation.validateLocality("----").ok, false);
  assert.equal(countySource.includes("localityGroups"), false);
  assert.equal(countySource.includes("romanianLocalities"), false);
});

test("onboarding form clears dependent geography fields and uses controlled Romania selectors", () => {
  const source = fs.readFileSync(path.resolve("src/components/onboarding/OnboardingForm.tsx"), "utf8");

  assert.equal(source.includes("SearchableSelect"), true);
  assert.equal(source.includes("getAdministrativeAreaOptions"), true);
  assert.equal(source.includes("getLocalityOptions"), false);
  assert.equal(source.includes("validateCountryLocality"), false);
  assert.equal(source.includes("validateLocality"), true);
  assert.equal(source.includes("Exemplu: Ploiești"), true);
  assert.equal(source.includes("Introdu localitatea sediului sau punctului principal de lucru."), true);
  assert.equal(source.includes("companyPhoneCountry: value"), true, "changing country must update phone country context");
  assert.equal(source.includes('administrativeArea: "", city: ""'), true, "changing country must clear region and locality");
  assert.equal(source.includes('if (name === "administrativeArea")'), true, "changing region must clear locality");
  assert.equal(source.includes('return { ...current, administrativeArea: value, city: "" }'), true);
});

test("shared phone validation uses libphonenumber and normalizes E.164", () => {
  const validation = loadTsModule("src/lib/forms/validation.ts");

  assert.equal(validation.validateInternationalPhone("0721 000 000", "RO").value, "+40721000000");
  assert.equal(validation.validateInternationalPhone("020 7946 0018", "GB").value, "+442079460018");
  assert.equal(validation.validateInternationalPhone("(202) 555-0125", "US").value, "+12025550125");
  assert.equal(validation.validateInternationalPhone("030 123456", "DE").value, "+4930123456");
  assert.equal(validation.validateInternationalPhone("020 7946 0018", "RO").ok, false);
  assert.equal(validation.validateInternationalPhone("123", "US").ok, false);
});

test("Romanian CUI validation is optional, RO-only and normalized", () => {
  const validation = loadTsModule("src/lib/forms/validation.ts");

  assert.equal(validation.validateRomanianCui("", "RO").ok, true);
  assert.equal(validation.validateRomanianCui("RO15432198", "RO").value, "15432198");
  assert.equal(validation.validateRomanianCui("ro 15432198", "RO").value, "15432198");
  assert.equal(validation.validateRomanianCui("15432197", "RO").ok, false);
  assert.equal(validation.validateRomanianCui("DE123456789", "DE").value, "");
});

test("onboarding form only sends CUI for Romanian businesses", () => {
  const source = fs.readFileSync(path.resolve("src/components/onboarding/OnboardingForm.tsx"), "utf8");

  assert.equal(source.includes('draft.countryCode === "RO" ? <Field label="CUI"'), true);
  assert.equal(source.includes('if (key === "cui" && draft.countryCode !== "RO")'), true);
  assert.equal(source.includes('cui: value === "RO" ? current.cui : ""'), true);
  assert.equal(source.includes("CUI / VAT"), false);
  assert.equal(source.includes("identificator fiscal"), false);
});

test("onboarding action derives ownership server-side and does not use forbidden owner_id", () => {
  const source = fs.readFileSync(path.resolve("src/lib/actions.ts"), "utf8");
  const provisioning = fs.readFileSync(path.resolve("src/lib/business/provision-business.ts"), "utf8");
  const normalization = fs.readFileSync(path.resolve("src/lib/business/onboarding-normalization.ts"), "utf8");

  assert.equal(source.includes("provisionBusinessFromOnboarding(formData)"), true);
  assert.equal(provisioning.includes("owner_profile_id: current.profile.id"), true);
  assert.equal(provisioning.includes("owner_id"), false);
  assert.equal(normalization.includes("validateInternationalPhone"), true);
  assert.equal(normalization.includes("validateAdministrativeArea"), true);
  assert.equal(normalization.includes("validateLocality"), true);
  assert.equal(normalization.includes("validateCountryLocality"), false);
  assert.equal(normalization.includes("isCountryCode"), true);
  assert.equal(normalization.includes("validateWebsite"), true);
  assert.equal(normalization.includes("validateRomanianCui"), true);
  assert.equal(provisioning.includes("cui: parsed.cui"), true);
  assert.equal(provisioning.includes("country_code: parsed.countryCode"), true);
  assert.equal(provisioning.includes("administrative_area_code: parsed.administrativeAreaCode || null"), true);
  assert.equal(provisioning.includes("company_phone_e164: parsed.companyPhoneE164"), true);
  assert.equal(provisioning.includes("postal_code: parsed.postalCode || null"), true);
  assert.equal(provisioning.includes("profile_id: profileId"), true);
  assert.equal(provisioning.includes('role: "owner"'), true);
  assert.equal(provisioning.includes("attemptedPayload"), false);
  assert.equal(provisioning.includes("...formData"), false);
});

test("company onboarding SQL package stores Romanian CUI without generic tax fields", () => {
  const dir = path.resolve("docs/sql/company-onboarding-data-quality-final");
  const combined = fs.readdirSync(dir)
    .filter((file) => file.endsWith(".sql") || file.endsWith(".md"))
    .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
    .join("\n");

  assert.equal(combined.includes("tax_identifier"), false);
  assert.equal(combined.includes("tax_identifier_country"), false);
  assert.equal(combined.includes("vat_number"), false);
  assert.equal(combined.includes("businesses_owner_id_absent"), true);
  assert.equal(combined.includes("'cui'"), true);
  assert.equal(combined.includes("add column if not exists cui"), false);
  assert.equal(combined.includes("businesses_cui_normalized_format"), true);
  assert.equal(combined.includes("Production status: David manually applied and verified"), true);
  assert.equal(combined.includes("company_onboarding_expected_rls_policies_present"), true);
  assert.equal(combined.includes("count(*) = 24"), true);
});
