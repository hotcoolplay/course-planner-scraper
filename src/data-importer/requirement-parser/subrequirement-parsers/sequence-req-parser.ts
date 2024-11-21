import { Page, ElementHandle } from "puppeteer";
import * as db from "../requirement-db";
import * as util from "../../scraper-utilities.js";

export async function fetchDegreeSequenceTable(page: Page, degreeId: number) {
  const selector = `::-p-xpath(//*[preceding-sibling::h4[text()='Study/Work Sequences Chart' or text()='Study/Work Sequence Chart']]/tbody)`;
  const tableBody = await page.$(selector);
  if (!tableBody)
    console.error(`No sequence table body found for degree ID ${degreeId}!`);
  else {
    const rows = await tableBody.$$(`::-p-xpath(./tr)`);
    let sequencesInProgram = 0;
    let programsOrDegrees: db.IProgramOrDegreeId[] = [];
    const sequenceNameExists = await existsSequenceName(page);
    for (const row of rows) {
      const sequence: Sequence = {
        name: null,
        sequence: [],
      };
      const data = await row.$$(`::-p-xpath(./td)`);
      for (let i = 0; i < data.length; ++i) {
        //If no sequences in program then this is a new row to add sequences too
        if (sequencesInProgram === 0) {
          // If no rowspan attribute then there's only one sequence
          sequencesInProgram = (await data[i].evaluate((el) =>
            el.getAttribute("rowspan")
          ))
            ? Number(await data[i].evaluate((el) => el.getAttribute("rowspan")))
            : 1;
          const programOrDegreeText = await util.cleanText(data[i]);
          if (!programOrDegreeText) {
            throw new Error(
              `No valid program in sequence table found for degree ID ${degreeId}!`
            );
          }
          programsOrDegrees = await convertProgramOrDegree(
            programOrDegreeText,
            degreeId
          );
          if (sequenceNameExists) {
            ++i;
            sequence.name = await data[i].evaluate((el) => el.textContent);
          }
        } else if (sequenceNameExists && i === 0) {
          sequence.name = await data[i].evaluate((el) => el.textContent);
        } else {
          const term = await data[i].evaluate((el) => el.textContent);
          if (term && !term.includes("†")) sequence.sequence.push(term);
        }
      }
      for (const programOrDegree of programsOrDegrees) {
        db.insertSequence(programOrDegree, sequence);
      }
      --sequencesInProgram;
    }
  }
}

async function convertProgramOrDegree(
  programOrDegreeText: string,
  degreeId: number
): Promise<db.IProgramOrDegreeId[]> {
  // Remove leading and trailing whitespaces
  programOrDegreeText = programOrDegreeText
    .replace(/^\s*/, "")
    .replace(/\s*$/, "");
  // Remove special symbols
  programOrDegreeText = programOrDegreeText.replace(/[*#]/g, "");
  // Replace double degree text with the official one so that it's searchable in the DB
  programOrDegreeText = programOrDegreeText.replace(
    /(\(double degree\)|double degree)/,
    "Double Degree"
  );

  const degree = await db.fetchDegreeName(degreeId);

  // Because UW hates consistency for some reason; the Science and Applied Science
  // degree page is delimited by commas, and a typo on the ASc page means there's
  // also a period delimiter
  const programsOrDegree =
    degree === "Bachelor of Science (Science)" ||
    degree === "Bachelor of Applied Science"
      ? programOrDegreeText.split(/[,.] /g)
      : programOrDegreeText.split("; ");
  const ids: db.IProgramOrDegreeId[] = [];
  for (const programOrDegree of programsOrDegree) {
    // General degree sequence(s)
    if (programOrDegree === "Life Physics") {
      continue;
    } else if (
      programOrDegree === "All other majors for the Bachelor of Mathematics" ||
      programOrDegree ===
        "Honours Arts co-op plans (excluding majors in Economics, English, Fine Arts, Mathematical Economics)"
    ) {
      //Degree id to be returned is just the one that was passed to the function
      const id: db.IProgramOrDegreeId = {
        programId: null,
        degreeId: degreeId,
      };
      ids.push(id);
    }
    // Another text delimited by commas :(
    else if (
      programOrDegree ===
      "Honours Arts co-op majors of Economics, English, Fine Arts, Mathematical Economics"
    ) {
      const newProgramList = programOrDegree
        .replace("Honours Arts co-op majors of ", "")
        .split(", ");
      const opts: db.IProgramSearchParams = {
        majorType: "H",
        parentProgram: null,
        parentDegree: degreeId,
      };
      for (const program of newProgramList) {
        const id = await db.searchProgramIds(program, opts);
        ids.push({ programId: id, degreeId: null });
      }
    } else {
      const opts: db.IProgramSearchParams = {
        majorType: null,
        parentProgram: null,
        parentDegree: degreeId,
      };
      const programText =
        degree === "Bachelor of Applied Science"
          ? programOrDegree + " Engineering"
          : programOrDegree;
      const id =
        programOrDegree === "Arts and Business"
          ? await db.fetchProgramId(programText)
          : await db.searchProgramIds(programText, opts);
      ids.push({ programId: id, degreeId: null });
    }
  }
  return ids;
}

export async function fetchMajorSequenceTable(page: Page, majorId: number) {
  const selector = `::-p-xpath(//*[preceding-sibling::h4[text()='Study/Work Sequences Chart' or text()='Study/Work Sequence Chart' or text()='Study/Work Sequence Information Chart']]/tbody)`;
  const tableBody = await page.$(selector);
  if (!tableBody) console.log(`No sequence table found for ${majorId}.`);
  else {
    const rows = await tableBody.$$(`::-p-xpath(./tr)`);
    const sequenceNameExists = await existsSequenceName(page);
    for (const row of rows) {
      const sequence: Sequence = {
        name: null,
        sequence: [],
      };
      const data = await row.$$(`::-p-xpath(./td)`);
      for (let i = 0; i < data.length; ++i) {
        //If no sequences in major then this is a new row to add sequences too
        if (sequenceNameExists && i === 0) {
          sequence.name = await data[i].evaluate((el) => el.textContent);
        } else {
          const term = await data[i].evaluate((el) => el.textContent);
          if (term && !term.includes("†")) sequence.sequence.push(term);
        }
      }
      const majorOrDegree: db.IProgramOrDegreeId = {
        programId: majorId,
        degreeId: null,
      };
      db.insertSequence(majorOrDegree, sequence);
    }
  }
}

async function existsSequenceName(page: Page): Promise<boolean> {
  const selector = `::-p-xpath(//*[preceding-sibling::h4[text()='Study/Work Sequences Chart' or text()='Study/Work Sequence Chart' or text()='Study/Work Sequence Information Chart']]/thead)`;
  const tableHead = await page.$(selector);
  if (!tableHead) throw new Error(`No table head!`);
  else {
    const cols = await tableHead.$$(`::-p-xpath(./tr/th)`);
    if (
      (await cols[1].evaluate((el) => el.textContent)) !== "S/S" &&
      (await cols[0].evaluate((el) => el.textContent)) !== "Sequence"
    )
      return false;
    else return true;
  }
}
