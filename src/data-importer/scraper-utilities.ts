import { Page, ElementHandle } from "puppeteer";
import * as db from "./scrapers/scraper-db.js";
import { IProgramSearchParams } from "./scrapers/scraper-db.js";

const majorTypes = ["H", "JH", "3G", "4G"] as const;
type MajorType = (typeof majorTypes)[number];

export const PROGRAM_INITIALS = new Map<string, string>([
  ["CS", "Computer Science"],
  ["CEC", "Climate and Environmental Change"],
  ["G", "Geomatics"],
  ["GEM", "Geography and Environmental Management"],
  ["CE", "Computer Engineering"],
  ["EE", "Electrical Engineering"],
]);

export const DEGREE_INITIALS = new Map<string, string>([
  ["BMath", "Bachelor of Mathematics"],
  ["BCS", "Bachelor of Computer Science"],
  ["BA", "Bachelor of Arts"],
  ["BSc", "Bachelor of Science (Science)"],
  ["BASc", "Bachelor of Applied Sciences"],
]);

export const PROGRAM_ABBREVIATIONS = new Map<string, string>([
  [
    "BBA & BMath Double Degree",
    "Business Administration and Mathematics Double Degree",
  ],
  [
    "BBA & BCS Double Degree",
    "Business Administration and Computer Science Double Degree",
  ],
  [
    "Math/FARM - Chartered Financial Analyst Spec",
    "Mathematics/Financial Analysis and Risk Management - Chartered Financial Analyst Specialization",
  ],
  [
    "Math/FARM - Professional Risk Management Spec",
    "Mathematics/Financial Analysis and Risk Management - Professional Risk Management Specialization",
  ],
]);

export async function fetchSectionContent(
  page: Page,
  heading: string,
  wait: boolean
): Promise<string[]> {
  const selector = `::-p-xpath(//*[preceding-sibling::h3[contains(., '${heading}')]]//text())`;
  const content: string[] = [];
  if (wait) {
    try {
      await page.waitForSelector(selector);
      const elements = await page.$$(selector);
      if (!elements) throw new Error(`Couldn't find elements under ${heading}`);
      else {
        for (let i = 0; i < elements.length; ++i) {
          const text = await page.evaluate(
            (el: Element) => el.textContent,
            elements[i]
          );
          if (!text) throw new Error("Couldn't evaluate text in element!");
          else {
            content.push(text);
          }
        }
      }
    } catch {
      throw new Error(`Couldn't find ${heading}!`);
    }
  } else {
    const elements = await page.$$(selector);
    if (!elements) throw new Error(`Couldn't find elements under ${heading}`);
    else {
      for (let i = 0; i < elements.length; ++i) {
        const text = await page.evaluate(
          (el: Element) => el.textContent,
          elements[i]
        );
        if (!text) throw new Error("Couldn't evaluate text in element!");
        else {
          content.push(text);
        }
      }
    }
  }
  return content;
}

export async function cleanText(el: ElementHandle): Promise<string | null> {
  const nodes = await el.$$(
    `::-p-xpath(./node()[self::a or self::span or self::strong or self::p or self::text()])`
  );
  let text = "";
  for (let i = 0; i < nodes.length; ++i) {
    const name = await nodes[i].evaluate((el: Element) => el.nodeName);
    if (name === "SPAN" || name === "STRONG" || name === "P")
      text += await cleanText(nodes[i]);
    else if (name === "A") text += "a<" + (await cleanText(nodes[i])) + ">";
    else text += await nodes[i].evaluate((el: Element) => el.nodeValue);
  }
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0009\n]/g, "").replace("\n", "");
  return text;
}

export async function returnElement(page: Page, heading: string) {
  const selector = `::-p-xpath(//*[preceding-sibling::h3[contains(., '${heading}')]])`;
  return await page.$(selector);
}

export async function convertProgramName(name: string) {
  const hyphenRegex = /(?<=[A-Z])-(?=[A-Z])/g;

  const identifier = name.match(hyphenRegex)
    ? name.split(hyphenRegex)[0]
    : null;

  const degreeName = name.includes("(")
    ? DEGREE_INITIALS.get(name.split("(")[1].split(")")[0])
    : null;

  if (name.includes("(") && !degreeName) {
    throw new Error(
      `Couldn't grab degree name for ${name} when converting program name!`
    );
  }

  const degree = degreeName ? await db.searchDegreeId(degreeName) : null;

  let tempProgramName = name.match(hyphenRegex)
    ? name.split(hyphenRegex)[1].includes(" (")
      ? name.split(hyphenRegex)[1].split(" (")[0]
      : name.split(hyphenRegex)[1]
    : name;

  if (tempProgramName.endsWith("Diploma")) {
    tempProgramName = tempProgramName.replace(" Diploma", "");
    tempProgramName = "Diploma in " + tempProgramName;
  }

  if (tempProgramName === "Earth Sciences - Hydrogeology") {
    tempProgramName += " Specialization";
  }

  const majorType = identifier ? validateMajorType(identifier) : null;

  const parentMajor =
    identifier && !majorType && PROGRAM_INITIALS.get(identifier)
      ? PROGRAM_INITIALS.get(identifier) + ""
      : null;

  if (!majorType && !parentMajor && identifier) {
    console.log(name);
    throw new Error(`I'm not sure what this identifier is...${name}`);
  }
  const programName = PROGRAM_ABBREVIATIONS.get(tempProgramName)
    ? (PROGRAM_ABBREVIATIONS.get(tempProgramName) + "").replace("&", "and")
    : tempProgramName === "Optometry" || tempProgramName === "Pharmacy"
      ? tempProgramName.replace("&", "and") + "%(%"
      : tempProgramName.replace("&", "and");
  const opts: IProgramSearchParams = {
    majorType: majorType,
    parentDegree: degree,
    parentProgram: parentMajor,
  };
  const programId = await db.searchProgramIds(programName, opts);
  if (!programId) {
    throw new Error(`No matching converted program name for ${name}!`);
  } else return programId;
}

function validateMajorType(type: string): MajorType | null {
  if (!type) return null;

  const majorType = majorTypes.find((validType) => validType === type);
  if (majorType) return majorType;
  else return null;
}
