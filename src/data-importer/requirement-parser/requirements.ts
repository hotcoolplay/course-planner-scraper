import * as parser from "./subrequirement-parsers";
import { Page } from "puppeteer";

export async function parseDegreeRequirements(page: Page, degreeId: number) {
  await parser.fetchDegreeSequenceTable(page, degreeId);
}

export async function parseMajorRequirements(page: Page, majorId: number) {
  await parser.fetchMajorSequenceTable(page, majorId);
}
