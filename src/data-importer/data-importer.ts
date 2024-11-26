import {
  requestCourses,
  requestPrograms,
  requestDegrees,
} from "./data-scraper.js";

export async function startScraping() {
  requestCourses();
  requestPrograms();
  requestDegrees();
}
