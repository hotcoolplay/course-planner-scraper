import * as db from "./data-db.js";
import * as scraper from "./scrapers/index.js";
import axios from "axios";
import puppeteer from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import adblockerPlugin from "puppeteer-extra-plugin-adblocker";

interface CourseResponse {
  courseId: string;
  courseOfferNumber: number;
  termCode: string;
  termName: string;
  associatedAcademicCareer: string;
  associatedAcademicGroupCode: string;
  associatedAcademicOrgCode: string;
  subjectCode: string;
  catalogNumber: string;
  title: string;
  descriptionAbbreviated: string;
  description: string;
  gradingBasis: string;
  courseComponentCode: string;
  enrollConsentCode: string;
  enrollConsentDescription: string;
  dropConsentCode: string;
  dropConsentDescription: string;
  requirementsDescription: string;
}

interface TermResponse {
  termCode: string;
  name: string;
  nameShort: string;
  termBeginDate: string;
  termEndDate: string;
  sixtyPercentCompleteDate: string;
  associatedAcademicYear: number;
}

export async function requestDegrees() {
  const uGradUrl =
    "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/programs";
  puppeteer.use(stealthPlugin());
  puppeteer.use(adblockerPlugin());
  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch();
  console.log("Opening undergrad page...");
  const page = await browser.newPage();
  console.log("Going to url...");
  await page.goto(uGradUrl);
  console.log("Scraping degrees...");
  const popup = await page.$("#sliding-popup");
  if (popup) {
    await page.evaluate((el) => el.remove(), popup);
  }
  const buttonSelector = 'xpath///li/div[contains(@name, "Degree")]/div/button';
  await page.waitForSelector(buttonSelector);
  const buttons = await page.$$(buttonSelector);
  for (const el of buttons) {
    await el.click();
  }
  const linkSelector = "xpath///li/div/div/div/div/ul//a";
  await page.waitForSelector(linkSelector);
  const links = await page.$$(linkSelector);
  links.push;
  for (let i = 0; i < links.length; ++i) {
    const link = await page.evaluate(
      (el: Element) => (<HTMLAnchorElement>el).href,
      links[i]
    );
    const degreeData = await scraper.scrapeDegrees(browser, link);
    if (degreeData.name) {
      const degree: Degree = {
        name: degreeData.name,
      };
      await db.insertDegrees(degree);
      console.log(`Inserted ${i + 1} of ${links.length} degrees...`);
    }
  }
}

export async function requestPrograms() {
  const uGradUrl =
    "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/programs";
  puppeteer.use(stealthPlugin());
  puppeteer.use(adblockerPlugin());
  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch();
  console.log("Opening undergrad page...");
  const page = await browser.newPage();
  console.log("Going to url...");
  await page.goto(uGradUrl);
  console.log("Scraping programs...");
  const popup = await page.$("#sliding-popup");
  if (popup) {
    await page.evaluate((el) => el.remove(), popup);
  }
  const listSelector =
    'xpath///main//div[contains(@id, "Undergraduate Credential Type-toggle")]';
  const diplomaSelector = 'xpath///div[contains(@data-value, "Diploma")]';
  const majorSelector = 'xpath///div[contains(@data-value, "Major")]';
  const minorSelector = 'xpath///div[contains(@data-value, "Minor")]';
  const optionSelector = 'xpath///div[contains(@data-value, "Option")]';
  const specializationSelector =
    'xpath///div[contains(@data-value, "Specialization")]';
  const programSelectors = [
    diplomaSelector,
    majorSelector,
    minorSelector,
    optionSelector,
    specializationSelector,
  ];
  for (let i = 0; i < programSelectors.length; ++i) {
    await page.waitForSelector(listSelector);
    const list = await page.$(listSelector);
    if (list) {
      await page.evaluate((el: Element) => (<HTMLDivElement>el).click(), list);
      await page.waitForSelector(programSelectors[i]);
      const programType = await page.$(programSelectors[i]);
      if (programType)
        await page.evaluate(
          (el: Element) => (<HTMLDivElement>el).click(),
          programType
        );
      else {
        throw new Error("Couldn't click program type!");
      }
    } else {
      throw new Error("Couldn't re-click list!");
    }
  }

  const linkSelector = "xpath///li/div/div/div/div/ul//a";
  await page.waitForSelector(linkSelector);
  const links = await page.$$(linkSelector);
  for (let i = 0; i < links.length; ++i) {
    const link = await page.evaluate(
      (el: Element) => (<HTMLAnchorElement>el).href,
      links[i]
    );
    const programData = await scraper.scrapePrograms(browser, link);
    if (programData.name && programData.programSubtype && programData.urlCode) {
      if ("majorType" in programData) {
        const major: Major = {
          name: programData.name,
          programSubtype: programData.programSubtype,
          urlCode: programData.urlCode,
          majorType: programData.majorType,
          degreeId: programData.degreeId,
          regular: programData.regular,
          coop: programData.coop,
        };
        await db.insertMajors(major);
      } else if ("parentMajors" in programData) {
        const specialization: Specialization = {
          name: programData.name,
          programSubtype: programData.programSubtype,
          urlCode: programData.urlCode,
          parentMajors: programData.parentMajors,
        };
        await db.insertSpecializations(specialization);
      } else if ("parentDegrees" in programData) {
        const option: Option = {
          name: programData.name,
          programSubtype: programData.programSubtype,
          urlCode: programData.urlCode,
          parentDegrees: programData.parentDegrees,
        };
        await db.insertOptions(option);
      } else {
        const program: Program = {
          name: programData.name,
          programSubtype: programData.programSubtype,
          urlCode: programData.urlCode,
        };
        await db.insertPrograms(program);
      }
      console.log(`Inserted ${i + 1} of ${links.length} programs...`);
    }
  }
}

export async function requestCourses() {
  console.log("Calling course API...");
  const options = {
    method: "GET",
    url: "https://openapi.data.uwaterloo.ca/v3/Courses/1249",
    headers: {
      "x-api-key": process.env.UW_API_KEY_V3,
    },
  };
  await axios
    .request(options)
    .then(async function ({ data }: { data: CourseResponse[] }) {
      const uGradUrl =
        "https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses";
      puppeteer.use(stealthPlugin());
      puppeteer.use(adblockerPlugin());
      console.log("Launching puppeteer...");
      const browser = await puppeteer.launch();
      console.log("Opening undergrad page...");
      const uGradPage = await browser.newPage();
      console.log("Going to url...");
      await uGradPage.goto(uGradUrl);

      console.log("Scraping courses...");
      let uGradCourses = 1;
      for (let i = 0; i < data.length; ++i) {
        if (data[i].associatedAcademicCareer === "UG") {
          if (data[i].subjectCode === "MSCI") data[i].subjectCode = "MSE";
          if (
            (data[i].associatedAcademicGroupCode === "REN" ||
              data[i].associatedAcademicGroupCode === "STJ" ||
              data[i].associatedAcademicGroupCode === "STP" ||
              data[i].associatedAcademicGroupCode === "CGC") &&
            data[i].subjectCode !== "BASE" &&
            data[i].subjectCode !== "EMLS" &&
            data[i].subjectCode !== "SWREN"
          )
            data[i].associatedAcademicGroupCode = "ART";
          else if (data[i].associatedAcademicGroupCode === "AHS")
            data[i].associatedAcademicGroupCode = "HEA";
          console.log(data[i].subjectCode + data[i].catalogNumber);
          const courseData = await scraper.scrapeCourse(
            browser,
            uGradPage,
            data[i].subjectCode,
            data[i].catalogNumber
          );
          if (courseData.units !== null) {
            const course: Course = {
              courseid: data[i].courseId,
              title: data[i].title,
              subject: data[i].subjectCode,
              catalogNumber: data[i].catalogNumber,
              faculty: data[i].associatedAcademicGroupCode,
              units: courseData.units,
              component: data[i].courseComponentCode,
              completions: courseData.completions,
              simulEnroll: courseData.simulEnroll,
              grading: data[i].gradingBasis,
              description: data[i].description,
            };
            await db.insertCourses(course);
            console.log(`Inserted ${uGradCourses++} courses...`);
          }
        }
      }
      await uGradPage.close();
      await browser.close();
    })
    .catch(function (error) {
      console.error(error);
      return "Couldn't fetch course data. Try again later?";
    });
}

export async function requestTerms() {
  console.log("Calling term API...");
  const options = {
    method: "GET",
    url: "https://openapi.data.uwaterloo.ca/v3/Terms",
    headers: {
      "x-api-key": process.env.UW_API_KEY_V3,
    },
  };
  await axios
    .request(options)
    .then(async function ({ data }: { data: TermResponse[] }) {
      for (let i = 0; i < data.length; ++i) {
        const term: Term = { code: data[i].termCode, name: data[i].name };
        await db.insertTerms(term);
        console.log(term.name + ": " + term.code);
      }
    })
    .catch(function (error) {
      console.error(error);
      return "Couldn't fetch term data. Try again later?";
    });
}

export async function requestTermCourseList() {
  console.log("Calling class schedule API...");
  const terms = await db.getTerms();
  for (let i = 0; i < terms.length; ++i) {
    const options = {
      method: "GET",
      url: "https://openapi.data.uwaterloo.ca/v3/ClassSchedules/",
      headers: {
        "x-api-key": process.env.UW_API_KEY_V3,
      },
    };
    const termName = (
      terms[i].name.charAt(0).toLowerCase() + terms[i].name.slice(1)
    ).replace(" ", "_");
    options.url += terms[i].code;
    await axios
      .request(options)
      .then(async function ({ data }: { data: string[] }) {
        await db.createTermTable(termName);
        for (let i = 0; i < data.length; ++i) {
          await db.insertTermCourses(termName, data[i]);
        }
        console.log(termName);
      })
      .catch(function (err) {
        console.log(err);
        throw new Error("Couldn't fetch class schedule data. Try again later?");
      });
  }
}
