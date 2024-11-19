import * as parser from "./subrequirement-parsers";
import { Page } from "puppeteer";

export async function parseDegreeRequirements(page: Page, degreeId: number) {
  await parser.fetchSequenceTable(page, degreeId);
}
