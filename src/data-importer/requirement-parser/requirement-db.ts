import pool from "../../pool.js";

export interface IProgramSearchParams {
  majorType: majorType | null;
  parentProgram: string | null;
  parentDegree: number | null;
}

export interface IProgramOrDegreeId {
  programId: number | null;
  degreeId: number | null;
}

export async function insertWorkRequirements(requirement: WorkRequirement) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO requirements
            VALUES(DEFAULT, $1, $2, $3, $4, $5)
            RETURNING id`,
      [
        requirement.requirementType,
        requirement.degreeId,
        requirement.programId,
        requirement.requirementSubtype,
        requirement.antirequirement,
      ]
    );
    const id = result.rows[0].id;
    await client.query(
      `INSERT INTO work_requirements
            VALUES($1, $2, $3)`,
      [id, requirement.workTerms, requirement.workType]
    );
    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    throw new Error(`${err}`);
  } finally {
    client.release();
  }
}

export async function insertSequence(
  programOrDegreeId: IProgramOrDegreeId,
  sequence: Sequence
) {
  await pool.query(
    `INSERT INTO sequences
    VALUES(DEFAULT, $1, $2, $3, $4)
    `,
    [
      sequence.name,
      programOrDegreeId.programId,
      programOrDegreeId.degreeId,
      sequence.sequence,
    ]
  );
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

export async function fetchProgramId(name: string): Promise<number> {
  const result = await pool.query(
    `SELECT id from programs
    WHERE name = $1`,
    [name]
  );
  try {
    return result.rows[0].id;
  } catch (err) {
    throw new Error(`Couldn't find matching program id for ${name}!`);
  }
}

export async function searchProgramIds(
  name: string,
  opts?: IProgramSearchParams
): Promise<number> {
  try {
    if (!opts) {
      const result = await pool.query(
        `SELECT id FROM degrees
            WHERE name LIKE $1`,
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
        opts.parentProgram + " (%",
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
    try {
      if (!opts) {
        console.error(err);
        throw new Error(
          `Couldn't find ID for ${name}${opts ? ", " + Object.entries(opts) : null}}!`
        );
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
            name + " -%(%",
            opts.parentDegree,
            opts.majorType,
          ]);
          return result.rows[0].id;
        }
        const result = await pool.query(query, [
          name + " -%(%",
          opts.parentDegree,
        ]);
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
          opts.parentProgram + " (%",
        ]);
        return result.rows[0].id;
      } else if (opts.majorType) {
        const query = `SELECT programs.id AS id
      FROM programs
      INNER JOIN majors
      USING (id)
      WHERE programs.name LIKE $1
      AND majors.major_type = $2`;
        const result = await pool.query(query, [
          name + " -%(%",
          opts.majorType,
        ]);
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
        `Couldn't find ID for ${name}${opts ? ", " + Object.entries(opts) : null}}!`
      );
    }
  }
}
