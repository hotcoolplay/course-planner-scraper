import * as db from "./prerequisite-db.js";
import * as util from "../scraper-utilities.js";

interface IPrerequisiteParserProperties {
  parentPrerequisiteId: number | null;
  coreqId: number | null;
  requisiteType: requisiteType | null;
}

export async function parsePrerequisite(
  prerequisite: string,
  requisiteType: requisiteType,
  parentPrerequisiteId: number | null,
  parentCourseId: number | null,
  coreqId: number | null
): Promise<IPrerequisiteParserProperties> {
  // Typo cleanup
  prerequisite = prerequisite.replace(/MSC(?:i|I)/g, "MSCI");
  prerequisite = prerequisite.replace("BUS498KW", "BUS498W");
  prerequisite = prerequisite.replace("cuncurrently", "concurrently");
  prerequisite = prerequisite.replace("Hnours", "Honours");

  const coursePrereq =
    /^a<([A-Z]{2,6}\s?[0-9]{1,3}[A-Z]?)> - .+ \([0-9].[0-9]{2}\)$/g.exec(
      prerequisite
    );
  const parentPrereq =
    /^(?:Must have c|C)omplete(?:|d)(| or concurrently enrolled in)(?:| at least)(| [1-9]| one| all)(?:| of)(?:| the following)(?:| course):?\s*$/g.exec(
      prerequisite
    );
  const pseudoCoursePrereq =
    /^(?:Must have c|C)omplete(?:|d)(| or concurrently enrolled in)(?:| at least)(| [1-9]| one| all)(?:| of)(?:| the following)(?:| course):?\s*((?:(?:(?:[A-Z]{2,6}\s*[0-9]{1,3}[A-Z]?(?:(?: or |\/)[A-Z]{0,6}\s*[0-9]{3}K?[A-Z]?)*))*\s*(?:|\(Topic [0-9]*:?[^)]*|\(?(?:taken|prior to)[^)]*)\)?,?\s*)+).?$/g.exec(
      prerequisite
    );
  const parentAntireq =
    /^\s*Not complete(?:|d)(?:| nor| or)(?:| concurrently| currently)(?:| enrolled)(?:| in)(?:| any of)(?:| the following):?\s*$/g.exec(
      prerequisite
    );
  const pseudoCourseAntireq =
    /^\s*Not complete(?:|d)(?:| nor| or)(?:| concurrently| currently)(?:| enrolled)(?:| in)(?:| any of)(?:| the following):?\s*((?:(?:(?:[A-Z]{2,6}\s*[0-9]{1,3}[A-Z]?(?:(?: or |\/)[A-Z]{0,6}\s*[0-9]{3}K?[A-Z]?)*))*\s*(?:|\(Topic [0-9]*:?[^)]*|\(?(?:taken|prior to)[^)]*)\)?,?\s*)+)$/g.exec(
      prerequisite
    );
  const levelPrereq =
    /^Students must be in level ([1-9][AB])(| or higher)$/g.exec(prerequisite);
  const gradePrereq =
    /^Earned a minimum grade of ([0-9]{2})% in (each|at least [1-9]) of the following: $/g.exec(
      prerequisite
    );
  const unitPrereq =
    /^Earned (?:|at least )([0-9.]{1,4}) units from((?: [A-Z]{2,6},?(?:| or))+)( [0-9]{3} - [0-9]{3}| [0-9]{3}-level studio courses)*$/g.exec(
      prerequisite
    );
  const cumulativeAveragePrereq =
    /^(?:Must have e|E)arned a minimum cumulative average of ([0-9]{2})(?:|.0|.0%|.0%.)$/g.exec(
      prerequisite
    );
  const programAveragePrereq =
    /^(?:Must have e|E)arned a minimum \s*(?:|cumulative)\s*(major|[A-Z]{2,6}|[A-Z]{2,6}\s*major|(?:[A-Z][a-z]+\s*)+|(?:[A-Z][a-z]+\s*)+\s*major)\s* average of ([0-9]{2})(?:|.0|.0%|.0%.)$/g.exec(
      prerequisite
    );
  const attachedCoreq =
    /^(?:See c|C)ore(?:|re)quisite(?:|s)(?:| \(see below\))$/g.exec(
      prerequisite
    );
  const programPrereq = /^Enrolled in ((?:(?:\s*or\s*|\s*)a<[^>]*>,?)+)$/g.exec(
    prerequisite
  );
  const programAntireq =
    /^Not open to students enrolled in ((?:(?:\s*or\s*|\s*)a<[^>]*>,?)+)$/g.exec(
      prerequisite
    );
  // Couple edge cases is dealt w here:
  // Honours Life Physics and "program offered by all faculties"
  const pseudoProgramPrereq =
    /^Enrolled in(?! a program offered by all| a Bachelor).*(?:Honours(?! Life Physics)|Facult|co-operative).*$/g.exec(
      prerequisite
    );
  const pseudoProgramAntireq =
    /^Not open to students (?! a program offered by all).*(?:Honours(?! Life Physics)|Facult|co-operative).*$/g.exec(
      prerequisite
    );
  const degreePrereq =
    /^Enrolled in\s*(?:a|)\s*((?:\s*or\s*|)BASc|Bachelor of .*?)\s*(?:program|)\s*(?:in the (Faculty of .*)|)$/g.exec(
      prerequisite
    );
  const degreeAntireq =
    /^Not open to students enrolled in (Bachelor of .*?)\s*(?:programs|)$/g.exec(
      prerequisite
    );
  if (coursePrereq) {
    const subject = /^[A-Z]{2,6}/.exec(coursePrereq[1])![0];
    const catalog = /[0-9]{1,3}[A-Z]?$/.exec(coursePrereq[1])![0];
    const courseId = await db.searchCourses(subject, catalog);
    await db.insertCoursePrerequisites({
      parentPrerequisiteId: parentPrerequisiteId,
      parentCourseId: parentCourseId,
      requisiteType: requisiteType,
      requisiteSubtype: "course",
      courseId: courseId,
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (parentPrereq) {
    if (parentPrereq[1] !== "") requisiteType = "coreq";
    const amount =
      parentPrereq[2] === "" || parentPrereq[2].trim() === "all"
        ? 0
        : parentPrereq[2] === " one"
          ? 1
          : Number(parentPrereq[2].trim());
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      amount: amount,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: requisiteType,
    };
  } else if (pseudoCoursePrereq) {
    if (pseudoCoursePrereq[1] !== "") requisiteType = "coreq";
    const amount =
      pseudoCoursePrereq[2] === "" || pseudoCoursePrereq[2].trim() === "all"
        ? 0
        : pseudoCoursePrereq[2] === " one"
          ? 1
          : Number(pseudoCoursePrereq[2].trim());
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      amount: amount,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
    });
    const courses = pseudoCoursePrereq[3].split(
      /(?<!\([^)]*),\s+(?!(?:|fall|winter|spring)\s*[0-9]{4})/g
    );
    parseCourses(courses, requisiteType, parentPrerequisiteId);
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (parentAntireq) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      amount: 0,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: "antireq",
    };
  } else if (pseudoCourseAntireq) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      amount: 0,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
    });
    const courses = pseudoCourseAntireq[1].split(
      /(?<!\([^)]*),\s+(?!(?:|fall|winter|spring)\s*[0-9]{4})/g
    );
    parseCourses(courses, "antireq", parentPrerequisiteId);
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (levelPrereq) {
    const level = levelPrereq[1];
    db.insertLevelPrerequisites({
      level: levelPrereq[2] === "" ? level : level + "+",
      requisiteType: "prereq",
      requisiteSubtype: "level",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (gradePrereq) {
    const grade = Number(/[0-9]{2}/.exec(gradePrereq[1]));
    const amt =
      gradePrereq[2] === "each" ? 0 : Number(/[1-9]/.exec(gradePrereq[2]));
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      amount: amt,
      grade: grade,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: requisiteType,
    };
  } else if (unitPrereq) {
    const units = Number(unitPrereq[1]);
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      units: units,
    });
    const subjects = unitPrereq[2]
      .replace(/\s/g, "")
      .replace("or", "")
      .split(",");
    let minCatalogNumber = null;
    let maxCatalogNumber = null;
    let component = null;
    if (/[0-9]{3} - [0-9]{3}/g.exec(unitPrereq[3])) {
      minCatalogNumber = Number(unitPrereq[3].split("-")[0].trim());
      maxCatalogNumber = Number(unitPrereq[3].split("-")[1].trim());
    } else if (/[0-9]{3}-level studio courses/g.exec(unitPrereq[3])) {
      const level = Number(/[0-9]{3}/g.exec(unitPrereq[3])![0]);
      minCatalogNumber = level;
      maxCatalogNumber = level + 99;
      component = "STU";
    }
    for (let i = 0; i < subjects.length; ++i) {
      db.insertPseudoCoursePrerequisites({
        ...nullPseudoCoursePrerequisite,
        requisiteType: "prereq",
        requisiteSubtype: "pseudoCourse",
        parentPrerequisiteId: parentPrerequisiteId,
        subject: subjects[i],
        minCatalogNumber: minCatalogNumber,
        maxCatalogNumber: maxCatalogNumber,
        component: component,
      });
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (cumulativeAveragePrereq) {
    const cumulativeAverage = Number(cumulativeAveragePrereq[1]);
    db.insertCumulativeAveragePrerequisites({
      requisiteType: "prereq",
      requisiteSubtype: "cumulativeAverage",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      cumulativeAverage: cumulativeAverage,
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (programAveragePrereq) {
    const average = Number(programAveragePrereq[2]);
    if (programAveragePrereq[1] === "major") {
      db.insertMajorAveragePrerequisites({
        requisiteType: "prereq",
        requisiteSubtype: "majorAverage",
        parentCourseId: parentCourseId,
        parentPrerequisiteId: parentPrerequisiteId,
        majorAverage: average,
      });
    } else {
      let programName = programAveragePrereq[1].split(/\s+major/g)[0];
      if (programName === "ANTH") programName = "Anthropology";
      else if (programName === "HRM")
        programName = "Human Resources Management";
      const programs = await db.searchPrograms(programName);
      parentPrerequisiteId = await db.insertParentPrerequisites({
        ...nullParentPrerequisite,
        requisiteType: "prereq",
        requisiteSubtype: "parent",
        parentCourseId: parentCourseId,
        parentPrerequisiteId: parentPrerequisiteId,
        programAverage: average,
      });
      for (const program of programs) {
        db.insertProgramPrerequisites({
          requisiteType: "prereq",
          requisiteSubtype: "program",
          parentCourseId: null,
          parentPrerequisiteId: parentPrerequisiteId,
          programId: program[0],
        });
      }
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (attachedCoreq) {
    return {
      parentPrerequisiteId: null,
      coreqId: parentPrerequisiteId,
      requisiteType: null,
    };
  } else if (programPrereq) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    const programText = programPrereq[1];
    const programs = programText.match(/(?<=a<)[^>]*(?=>)/g)!;
    for (const program of programs) {
      if (
        program === "Experiential Education (EDGE) Certificate" ||
        program === "Co-operative Education Research Certificate"
      ) {
        db.insertOtherPrerequisites({
          requisiteType: "prereq",
          requisiteSubtype: "other",
          parentCourseId: null,
          parentPrerequisiteId: parentPrerequisiteId,
          other: `Enrolled in ${program}`,
        });
      } else {
        const programId = await util.convertProgramName(program);
        db.insertProgramPrerequisites({
          requisiteType: "prereq",
          requisiteSubtype: "program",
          parentCourseId: null,
          parentPrerequisiteId: parentPrerequisiteId,
          programId: programId,
        });
      }
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (programAntireq) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    const programText = programAntireq[1];
    const programs = programText.match(/(?<=a<)[^>]*(?=>)/g)!;
    for (const program of programs) {
      const programId = await util.convertProgramName(program);
      db.insertProgramPrerequisites({
        requisiteType: "antireq",
        requisiteSubtype: "program",
        parentCourseId: null,
        parentPrerequisiteId: parentPrerequisiteId,
        programId: programId,
      });
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (pseudoProgramPrereq) {
    const pseudoProgramText = pseudoProgramPrereq[0]
      .replace(
        /Enrolled in (?:an|a program offered by\s*(?:the|)|a program in|a|)\s*/g,
        ""
      )
      .replace(/(?:\s*(?:program|plan)|(?:Faculty of|Faculties of)\s*)/g, "");
    const pseudoPrograms = pseudoProgramText.split(
      /\s*(?:, or|or a(?:n|)|or|,)\s*/
    );
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    let majorType: majorType | null = null;
    let majorSystem: majorSystem | null = null;
    for (const pseudoProgram of pseudoPrograms) {
      if (pseudoProgram === "Mathematics/BASE") {
        db.insertOtherPrerequisites({
          requisiteType: "prereq",
          requisiteSubtype: "other",
          parentCourseId: null,
          parentPrerequisiteId: parentPrerequisiteId,
          other: "Enrolled in Mathematics/BASE",
        });
      } else {
        if (pseudoProgram.includes("Honours")) majorType = "H";
        if (pseudoProgram.includes("co-operative"))
          majorSystem = "Co-operative";
        const facultyName = pseudoProgram
          .replace(/Honours\s*/, "")
          .replace(/co-operative\s*/, "");
        const facultyCode =
          facultyName === "" ? null : await db.searchFaculties(facultyName);
        db.insertPseudoProgramPrerequisites({
          ...nullPseudoProgramPrerequisite,
          requisiteType: "prereq",
          requisiteSubtype: "pseudoProgram",
          parentPrerequisiteId: parentPrerequisiteId,
          faculty: facultyCode,
          majorType: majorType,
          majorSystem: majorSystem,
        });
      }
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (pseudoProgramAntireq) {
    const pseudoProgramText = pseudoProgramAntireq[0]
      .replace(
        /Not open to students\s*(?:enrolled|)\s*in (?:an|a program offered by\s*(?:the|)|a program in|a|the|programs offered by\s*(?:the|)|)\s*/g,
        ""
      )
      .replace(
        /(?:\s*(?:program(?:s|)|plan)|(?:Faculty of|Faculties of)\s*)/g,
        ""
      );
    const pseudoPrograms = pseudoProgramText.split(
      /\s*(?:, or|or a(?:n|)|or|,)\s*/
    );
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    let majorType: majorType | null = null;
    let majorSystem: majorSystem | null = null;
    for (const pseudoProgram of pseudoPrograms) {
      if (pseudoProgram === "Mathematics/BASE") {
        db.insertOtherPrerequisites({
          requisiteType: "prereq",
          requisiteSubtype: "other",
          parentCourseId: null,
          parentPrerequisiteId: parentPrerequisiteId,
          other: "Enrolled in Mathematics/BASE",
        });
      } else {
        if (pseudoProgram.includes("Honours")) majorType = "H";
        if (pseudoProgram.includes("co-operative"))
          majorSystem = "Co-operative";
        const facultyName = pseudoProgram
          .replace(/Honours\s*/, "")
          .replace(/co-operative\s*/, "");
        const facultyCode =
          facultyName === "" ? null : await db.searchFaculties(facultyName);
        db.insertPseudoProgramPrerequisites({
          ...nullPseudoProgramPrerequisite,
          requisiteType: "antireq",
          requisiteSubtype: "pseudoProgram",
          parentPrerequisiteId: parentPrerequisiteId,
          faculty: facultyCode,
          majorType: majorType,
          majorSystem: majorSystem,
        });
      }
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (degreePrereq) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    const degrees = degreePrereq[1].split(/\sor\s/g);
    for (let degree of degrees) {
      if (degreePrereq[2])
        degree += ` (${degreePrereq[2].replace("Faculty of ", "")})`;
      if (degree === "BASc") degree = "Bachelor of Applied Science";
      const degreeId = await db.searchDegrees(degree);
      db.insertDegreePrerequisites({
        requisiteType: "prereq",
        requisiteSubtype: "degree",
        parentCourseId: null,
        parentPrerequisiteId: parentPrerequisiteId,
        degreeId: degreeId,
      });
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (degreeAntireq) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    const degrees = degreeAntireq[1].split(/\sor\s/g);
    for (const degree of degrees) {
      const degreeId = await db.searchDegrees(degree);
      db.insertDegreePrerequisites({
        requisiteType: "antireq",
        requisiteSubtype: "degree",
        parentCourseId: null,
        parentPrerequisiteId: parentPrerequisiteId,
        degreeId: degreeId,
      });
    }
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  }
  // Edge case time!!
  else if (prerequisite === "Enrolled in an Engineering program") {
    db.insertPseudoProgramPrerequisites({
      ...nullPseudoProgramPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "pseudoProgram",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      faculty: "ENG",
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (
    prerequisite ===
    "Not completed nor concurrently enrolled in: All 200-, 300-, 400-level CS courses or equivalents"
  ) {
    db.insertPseudoCoursePrerequisites({
      ...nullPseudoCoursePrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoCourse",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      subject: "CS",
      minCatalogNumber: 200,
      maxCatalogNumber: 499,
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (
    prerequisite ===
    "Enrolled in a program offered by all faculties, excluding Faculty of Mathematics"
  ) {
    db.insertPseudoProgramPrerequisites({
      ...nullPseudoProgramPrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoProgram",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      faculty: "MAT",
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (
    prerequisite ===
    "(For students in the Faculty of Mathematics only), not completed nor concurrently enrolled in: BUS231W"
  ) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    db.insertPseudoProgramPrerequisites({
      ...nullPseudoProgramPrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoProgram",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      faculty: "MAT",
    });
    db.insertPseudoCoursePrerequisites({
      ...nullPseudoCoursePrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoCourse",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      subject: "BUS",
      catalogNumber: "231W",
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (
    prerequisite === "Not open to Arts and Business students in level 1A or 1B"
  ) {
    const programId = (await db.searchPrograms("Arts and Business"))[0][0];
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    db.insertProgramPrerequisites({
      requisiteType: "antireq",
      requisiteSubtype: "program",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      programId: programId,
    });
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    db.insertLevelPrerequisites({
      requisiteType: "antireq",
      requisiteSubtype: "level",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      level: "1A",
    });
    db.insertLevelPrerequisites({
      requisiteType: "antireq",
      requisiteSubtype: "level",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      level: "1B",
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else if (
    prerequisite ===
      "The following antirequisites are only for students in the Faculty of Mathematics." ||
    prerequisite ===
      "The following prerequisites are applicable to students enrolled in a Faculty of Mathematics program"
  ) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    db.insertPseudoProgramPrerequisites({
      ...nullPseudoProgramPrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoProgram",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      faculty: "MAT",
    });
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    if (
      prerequisite ===
      "The following antirequisites are only for students in the Faculty of Mathematics."
    )
      requisiteType = "antireq";
    else requisiteType = "prereq";
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: requisiteType,
    };
  } else if (
    prerequisite ===
      "Corequisite is for students enrolled in Chemical Engineering only:" ||
    prerequisite ===
      "The corequisite listed is only for students majoring in Kinesiology" ||
    prerequisite === "Corequisite is for H-Kinesiology students only" ||
    prerequisite ===
      "Corequisite is for students enrolled in Biotechnology/Chartered Professional Accountancy"
  ) {
    const programIds = prerequisite.includes("Chemical Engineering")
      ? await db.searchPrograms("Chemical Engineering")
      : prerequisite.includes(
            "Biotechnology/Chartered Professional Accountancy"
          )
        ? await db.searchPrograms(
            "Biotechnology/Chartered Professional Accountancy"
          )
        : prerequisite.includes("H-Kinesiology")
          ? [await util.convertProgramName("H-Kinesiology")]
          : await db.searchPrograms("Kinesiology");
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    for (const programId of programIds) {
      db.insertProgramPrerequisites({
        requisiteType: "antireq",
        requisiteSubtype: "program",
        parentCourseId: null,
        parentPrerequisiteId: parentPrerequisiteId,
        programId: Array.isArray(programId) ? programId[0] : programId,
      });
    }
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: "coreq",
    };
  } else if (
    prerequisite ===
    "Corequisite is for students enrolled in a Faculty of Science program (with the exception of Mathematical Physics)"
  ) {
    const programIds = [
      await util.convertProgramName("H-Mathematical Physics (BSc)"),
    ];
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    db.insertPseudoProgramPrerequisites({
      ...nullPseudoProgramPrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoProgram",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      faculty: "SCI",
    });
    for (const programId of programIds) {
      db.insertProgramPrerequisites({
        requisiteType: "prereq",
        requisiteSubtype: "program",
        parentCourseId: null,
        parentPrerequisiteId: parentPrerequisiteId,
        programId: programId,
      });
    }
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: "coreq",
    };
  } else if (
    prerequisite ===
    "The corequisite listed is only for students in Faculty of Science majors, except for Materials and Nanosciences, Mathematical Physics (BSc)"
  ) {
    const programIds = [
      await util.convertProgramName("H-Mathematical Physics (BSc)"),
    ];
    programIds.push(
      await util.convertProgramName("H-Materials and Nanosciences")
    );
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    db.insertPseudoProgramPrerequisites({
      ...nullPseudoProgramPrerequisite,
      requisiteType: "antireq",
      requisiteSubtype: "pseudoProgram",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      faculty: "SCI",
    });
    for (const programId of programIds) {
      db.insertProgramPrerequisites({
        requisiteType: "prereq",
        requisiteSubtype: "program",
        parentCourseId: null,
        parentPrerequisiteId: parentPrerequisiteId,
        programId: programId,
      });
    }
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: "coreq",
    };
  } else if (
    prerequisite ===
    "Corequisite is required if students have not completed 4U Math"
  ) {
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 1,
    });
    db.insertOtherPrerequisites({
      requisiteType: "antireq",
      requisiteSubtype: "other",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      other: "Must have taken 4U Math",
    });
    parentPrerequisiteId = await db.insertParentPrerequisites({
      ...nullParentPrerequisite,
      requisiteType: "prereq",
      requisiteSubtype: "parent",
      parentCourseId: null,
      parentPrerequisiteId: parentPrerequisiteId,
      amount: 0,
    });
    return {
      parentPrerequisiteId: parentPrerequisiteId,
      coreqId: coreqId,
      requisiteType: "coreq",
    };
  } else if (prerequisite === "AMATH231 can be taken concurrently") {
    if (!parentPrerequisiteId) {
      throw new Error(`No parent ID for PHYS242 edge case!`);
    }
    db.alterPHYS242Prerequisite(parentPrerequisiteId);
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  } else {
    db.insertOtherPrerequisites({
      requisiteType: requisiteType,
      requisiteSubtype: "other",
      parentCourseId: parentCourseId,
      parentPrerequisiteId: parentPrerequisiteId,
      other: prerequisite,
    });
    return {
      parentPrerequisiteId: null,
      coreqId: coreqId,
      requisiteType: null,
    };
  }
}

async function parseCourses(
  courses: string[],
  requisiteType: requisiteType,
  id: number
) {
  for (let i = 0; i < courses.length; ++i) {
    if (
      /(?<=(?:\/| or )[A-Z]{0,6}\s*[0-9]{1,3}[A-Z]?)(?:| .*)$/g.exec(courses[i])
    ) {
      const subcourses = courses[i]
        .split(/(?<=(?:\/| or )[A-Z]{0,6}\s*[0-9]{1,3}[A-Z]?)(?:| .*)$/g)[0]
        .split(/(?: or |\/)/g);
      let defaultSubject = "";
      for (let j = 0; j < subcourses.length; ++j) {
        const course = subcourses[j];
        const subject = /[A-Z]{2,6}/g.exec(course)
          ? /[A-Z]{2,6}/g.exec(course)![0]
          : defaultSubject;
        defaultSubject = subject;
        const catalog = /[0-9]{1,3}[A-Z]?/g.exec(course)![0];
        if (/Topic [0-9]*:?[^)]*/g.exec(courses![i].trim())) {
          const topics = /Topic [0-9]*:?[^)]*/g
            .exec(courses![i].trim())![0]
            .split(";");
          parseTopics(topics, requisiteType, subject, catalog, id);
        } else if (/(?:taken|prior)/g.exec(courses![i].trim())) {
          const terms = /(?:taken|prior)[^)]*/g
            .exec(courses![i].trim())![0]
            .split(/(?:,\s*|(?<=(?:taken|prior).*)\s+(?=fall|winter|spring))/g);
          parseTerms(terms, requisiteType, subject, catalog, id);
        } else {
          db.insertPseudoCoursePrerequisites({
            ...nullPseudoCoursePrerequisite,
            requisiteType: requisiteType,
            requisiteSubtype: "pseudoCourse",
            parentPrerequisiteId: id,
            subject: subject,
            catalogNumber: catalog,
          });
        }
      }
    } else {
      const course = /[A-Z]{2,6}\s*[0-9]{1,3}[A-Z]?/g.exec(courses[i].trim());
      const subject = /[A-Z]{2,6}/g.exec(course![0].replace(/\s/g, ""))![0];
      const catalog = /[0-9]{1,3}[A-Z]?/g.exec(
        course![0].replace(/\s/g, "")
      )![0];
      if (/Topic [0-9]*:?[^)]*/g.exec(courses![i].trim())) {
        const topics = /Topic [0-9]*:?[^)]*/g
          .exec(courses![i].trim())![0]
          .split(";");
        parseTopics(topics, requisiteType, subject, catalog, id);
      } else if (/(?:taken|prior)/g.exec(courses![i].trim())) {
        const terms = /(?:taken|prior)[^)]*/g
          .exec(courses![i].trim())![0]
          .split(/(?:,\s*|(?<=(?:taken|prior).*)\s+(?=fall|winter|spring))/g);
        parseTerms(terms, requisiteType, subject, catalog, id);
      } else {
        db.insertPseudoCoursePrerequisites({
          ...nullPseudoCoursePrerequisite,
          requisiteType: requisiteType,
          requisiteSubtype: "pseudoCourse",
          parentPrerequisiteId: id,
          subject: subject,
          catalogNumber: catalog,
        });
      }
    }
  }
}

async function parseTopics(
  topics: string[],
  requisiteType: requisiteType,
  subject: string,
  catalog: string,
  id: number
) {
  for (let i = 0; i < topics.length; ++i) {
    const topic = topics[i].replace(/Topic [0-9]*:?/g, "").trim();
    db.insertPseudoCoursePrerequisites({
      ...nullPseudoCoursePrerequisite,
      requisiteType: requisiteType,
      requisiteSubtype: "pseudoCourse",
      parentPrerequisiteId: id,
      subject: subject,
      catalogNumber: catalog,
      topic: topic,
    });
  }
}

async function parseTerms(
  terms: string[],
  requisiteType: requisiteType,
  subject: string,
  catalog: string,
  id: number
) {
  const comp = /taken in or before/g.exec(terms[0])
    ? "<="
    : /(?:|taken)\s*(?:before|prior to)[^)]*/g.exec(terms[0])
      ? "<"
      : "";
  let defaultTerm = "";
  for (let i = 1; i < terms.length; ++i) {
    const data = terms[i].split(" ");
    let term = comp;
    if (data[0] === "winter") {
      term += "W";
      defaultTerm = "W";
    } else if (data[0] === "fall") {
      term += "F";
      defaultTerm = "F";
    } else if (data[0] === "spring") {
      term += "S";
      defaultTerm = "S";
    } else term += defaultTerm;
    term += data.length > 1 ? data[1] : data[0];
    db.insertPseudoCoursePrerequisites({
      ...nullPseudoCoursePrerequisite,
      requisiteType: requisiteType,
      requisiteSubtype: "pseudoCourse",
      parentPrerequisiteId: id,
      subject: subject,
      catalogNumber: catalog,
      term: term,
    });
  }
}

const nullPseudoCoursePrerequisite: PseudoCoursePrerequisite = {
  parentCourseId: null,
  parentPrerequisiteId: null,
  requisiteType: "prereq",
  requisiteSubtype: "pseudoCourse",
  subject: null,
  catalogNumber: null,
  minCatalogNumber: null,
  maxCatalogNumber: null,
  topic: null,
  term: null,
  component: null,
};

const nullPseudoProgramPrerequisite: PseudoProgramPrerequisite = {
  parentCourseId: null,
  parentPrerequisiteId: null,
  requisiteType: "prereq",
  requisiteSubtype: "pseudoCourse",
  faculty: null,
  majorType: null,
  majorSystem: null,
};

const nullParentPrerequisite: ParentPrerequisite = {
  parentCourseId: null,
  parentPrerequisiteId: null,
  requisiteType: "prereq",
  requisiteSubtype: "parent",
  amount: null,
  grade: null,
  units: null,
  programAverage: null,
};
