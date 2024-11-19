import pool from "../../pool.js";

export async function insertParentPrerequisites(
  prereq: ParentPrerequisite
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO parent_prerequisites
            VALUES($1, $2, $3, $4, $5)
            `,
      [id, prereq.amount, prereq.grade, prereq.units, prereq.programAverage]
    );
    await client.query("COMMIT");
    return id;
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertCoursePrerequisites(prereq: CoursePrerequisite) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO course_prerequisites
            VALUES($1, $2)`,
      [id, prereq.courseId]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertProgramPrerequisites(prereq: ProgramPrerequisite) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO program_prerequisites
            VALUES($1, $2)`,
      [id, prereq.programId]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertLevelPrerequisites(prereq: LevelPrerequisite) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO level_prerequisites
            VALUES($1, $2)`,
      [id, prereq.level]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertPseudoCoursePrerequisites(
  prereq: PseudoCoursePrerequisite
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO pseudo_course_prerequisites
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        prereq.subject,
        prereq.catalogNumber,
        prereq.minCatalogNumber,
        prereq.maxCatalogNumber,
        prereq.topic,
        prereq.term,
        prereq.component,
      ]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertCumulativeAveragePrerequisites(
  prereq: CumulativeAveragePrerequisite
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO cumulative_average_prerequisites
            VALUES($1, $2)`,
      [id, prereq.cumulativeAverage]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertMajorAveragePrerequisites(
  prereq: MajorAveragePrerequisite
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO major_average_prerequisites
            VALUES($1, $2)`,
      [id, prereq.majorAverage]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertPseudoProgramPrerequisites(
  prereq: PseudoProgramPrerequisite
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO pseudo_program_prerequisites
            VALUES($1, $2, $3, $4)`,
      [id, prereq.faculty, prereq.majorType, prereq.majorSystem]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertDegreePrerequisites(prereq: DegreePrerequisite) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO degree_prerequisites
            VALUES($1, $2)`,
      [id, prereq.degreeId]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertOtherPrerequisites(prereq: OtherPrerequisite) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO prerequisites
            VALUES(DEFAULT, $1, $2, $3, $4)
            RETURNING id`,
      [
        prereq.parentPrerequisiteId,
        prereq.requisiteType,
        prereq.parentCourseId,
        prereq.requisiteSubtype,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO other_prerequisites
            VALUES($1, $2)`,
      [id, prereq.other]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function searchCourses(
  subject: string,
  catalogNumber: string
): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT id FROM courses
          WHERE subject = $1
          AND catalog_number = $2`,
      [subject, catalogNumber]
    );
    return result.rows[0].id;
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ${subject + catalogNumber}!`);
  }
}

export async function searchPrograms(programName: string): Promise<number[][]> {
  try {
    let query = {
      text: `SELECT id FROM programs
          WHERE program_subtype = 'Major'
          AND name LIKE $1`,
      values: [
        programName === "Arts and Business" ? programName : programName + "%(%",
      ],
      rowMode: "array",
    };
    const majors = await pool.query(query);
    if (majors.rows.length !== 0) {
      return majors.rows;
    } else {
      query = {
        text: `SELECT id FROM programs
            WHERE name LIKE $1`,
        values: [programName],
        rowMode: "array",
      };
      const result = await pool.query(query);
      return result.rows;
    }
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ${programName}!`);
  }
}

export async function searchDegrees(degreeName: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT id FROM degrees
          WHERE name = $1`,
      [degreeName]
    );
    return result.rows[0].id;
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ${degreeName}!`);
  }
}

export async function searchFaculties(facultyName: string): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT code FROM faculties
          WHERE faculty LIKE $1`,
      ["%" + facultyName + "%"]
    );
    return result.rows[0].code;
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ${facultyName}!`);
  }
}

export async function alterPHYS242Prerequisite(parentId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id FROM prerequisites
        WHERE parent_id = $1`,
      [parentId]
    );
    const id = result.rows[0].id;
    await client.query(
      `UPDATE prerequisites
        SET requisite_type = 'coreq'
        WHERE parent_id = $1`,
      [id]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}
