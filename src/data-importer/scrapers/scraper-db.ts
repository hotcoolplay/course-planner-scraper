import pool from "../../pool.js";

export interface IProgramSearchParams {
  majorType: majorType | null;
  parentProgram: string | null;
  parentDegree: number | null;
}

export async function searchDegreeId(name: string): Promise<number> {
  const result = await pool.query(
    `SELECT id FROM degrees
    WHERE name = $1`,
    [name]
  );
  try {
    return result.rows[0].id;
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ID for ${name}`);
  }
}

export async function fetchMajorDegreeId(name: string): Promise<number> {
  const result = await pool.query(
    `SELECT majors.degree_id AS degree_id
        FROM majors
        INNER JOIN programs
        USING (id)
        WHERE programs.name LIKE $1`,
    [name]
  );
  return result.rows[0].degree_id;
}

export async function searchMajorRegular(name: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT majors.regular AS regular
        FROM majors
        INNER JOIN programs
        USING (id)
        WHERE programs.name LIKE $1`,
    [name]
  );
  return result.rows[0].regular;
}

export async function searchMajorCoop(name: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT majors.coop AS coop
        FROM majors
        INNER JOIN programs
        USING (id)
        WHERE programs.name LIKE $1`,
    [name]
  );
  return result.rows[0].coop;
}

export async function fetchProgramId(name: string) {
  const result = await pool.query(
    `SELECT id FROM programs
    WHERE name = $1`,
    [name]
  );
  try {
    return result.rows[0].id;
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ID for ${name}`);
  }
}

//Allows for narrowing based on major type, parent major, parent degree
export async function searchProgramIds(
  name: string,
  opts?: IProgramSearchParams
): Promise<number> {
  try {
    if (!opts) {
      const result = await pool.query(
        `SELECT id FROM degrees
            WHERE name = $1`,
        [name]
      );
      return result.rows[0].id;
    } else if (opts.parentDegree) {
      let query = `SELECT programs.id AS id
        FROM programs
        INNER JOIN majors
        USING (id)
        WHERE programs.name LIKE $1 
        AND majors.degree_id = $2`;
      if (opts.majorType) {
        query += " AND majors.major_type = $3";
        const result = await pool.query(query, [
          name + " (%",
          opts.parentDegree,
          opts.majorType,
        ]);
        return result.rows[0].id;
      }
      const result = await pool.query(query, [name + " (%", opts.parentDegree]);
      return result.rows[0].id;
    } else if (opts.parentProgram) {
      const query = `SELECT pa.id AS id
    FROM programs AS pa
    INNER JOIN major_specializations AS ms
    ON pa.id = ms.specialization_id
    INNER JOIN programs AS pb
    ON ms.major_id = pb.id
    WHERE pa.name LIKE $1
    AND pb.name LIKE $2`;
      const result = await pool.query(query, [
        name,
        opts.parentProgram === "Computer Science"
          ? opts.parentProgram + " (%"
          : opts.parentProgram + " (%",
      ]);
      return result.rows[0].id;
    } else if (opts.majorType) {
      const query = `SELECT programs.id AS id
    FROM programs
    INNER JOIN majors
    USING (id)
    WHERE programs.name LIKE $1
    AND majors.major_type = $2`;
      const result = await pool.query(query, [name + " (%", opts.majorType]);
      return result.rows[0].id;
    } else {
      const query = `SELECT id FROM programs
    WHERE programs.name LIKE $1`;
      const result = await pool.query(query, [name]);
      return result.rows[0].id;
    }
  } catch (err) {
    console.error(err);
    throw new Error(
      `Couldn't find ID for ${name}${opts ? ", " + Object.entries(opts) : ""}!`
    );
  }
}

export async function searchCourseIds(
  subject: string,
  catalogNumber: string
): Promise<number> {
  const result = await pool.query(
    `SELECT id FROM courses
    WHERE subject = $1
    AND catalog_number = $2`,
    [subject, catalogNumber]
  );
  try {
    return result.rows[0].id;
  } catch (err) {
    console.error(err);
    throw new Error(`Couldn't find ID for ${subject + catalogNumber}`);
  }
}

export async function fetchDegreeName(id: number): Promise<string> {
  const result = await pool.query(
    `SELECT name from degrees
    WHERE id = $1`,
    [id]
  );
  try {
    return result.rows[0].name;
  } catch (err) {
    throw new Error(`Couldn't find matching degree name for ${id}!`);
  }
}
