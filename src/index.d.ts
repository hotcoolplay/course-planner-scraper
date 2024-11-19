interface Program {
  name: string;
  programSubtype: programSubtype;
  urlCode: string;
}

interface Major extends Program {
  degreeId: number;
  majorType: majorType;
  regular: boolean;
  coop: boolean;
}

interface Specialization extends Program {
  parentMajors: number[];
}

interface Option extends Program {
  parentDegrees: number[];
}

interface Degree {
  name: string;
}

interface Requirement {
  id: number;
  requirementType: requirementType;
  requirementSubtype: requirementSubtype;
  degreeId: number | null;
  programId: number | null;
  antirequirement: boolean;
}

interface UnitRequirement extends Requirement {
  majorType: majorType;
  unitType: unitType;
  units: number;
}

interface AverageRequirement extends Requirement {
  averageType: averageType;
  average: number;
  majorType: majorType;
}

interface BreadthRequirement extends Requirement {
  name: string;
  units: number;
}

interface CourseRequirement extends Requirement {
  parentId: number | null;
  courseId: number;
}

interface ParentCourseRequirement extends Requirement {
  parentId: number | null;
  term: string | null;
  grade: number | null;
  units: number | null;
  amount: number | null;
  isUCR: boolean;
}

interface PseudoCourseRequirement extends Requirement {
  parentId: number | null;
  subject: string | null;
  catalogNumber: string | null;
  minCatalogNumber: number | null;
  maxCatalogNumber: number | null;
  component: string | null;
}

interface DepthRequirement extends Requirement {
  units: number | null;
  prereqLength: number | null;
}

interface WorkRequirement extends Requirement {
  workTerms: number;
  workType: workType;
}

interface CourseListRequirement extends Requirement {
  parentId: number | null;
  name: string | null;
}

interface Sequence {
  name: string | null;
  sequence: string[];
}

interface Course {
  subject: string;
  catalogNumber: string;
  title: string;
  courseid: string;
  faculty: string;
  component: string;
  completions: number | null;
  simulEnroll: boolean | null;
  grading: string;
  units: number;
  description: string;
}

interface Term {
  name: string;
  code: string;
}

interface Prerequisite {
  parentPrerequisiteId: number | null;
  parentCourseId: number | null;
  requisiteType: requisiteType;
  requisiteSubtype: requisiteSubtype;
}

interface ParentPrerequisite extends Prerequisite {
  amount: number | null;
  grade: number | null;
  units: number | null;
  programAverage: number | null;
}

interface CoursePrerequisite extends Prerequisite {
  courseId: number;
}

interface ProgramPrerequisite extends Prerequisite {
  programId: number;
}

interface LevelPrerequisite extends Prerequisite {
  level: string;
}

interface OtherPrerequisite extends Prerequisite {
  other: string;
}

interface PseudoCoursePrerequisite extends Prerequisite {
  subject: string | null;
  catalogNumber: string | null;
  minCatalogNumber: number | null;
  maxCatalogNumber: number | null;
  topic: string | null;
  term: string | null;
  component: string | null;
}

interface CumulativeAveragePrerequisite extends Prerequisite {
  cumulativeAverage: number;
}

interface MajorAveragePrerequisite extends Prerequisite {
  majorAverage: number;
}

interface PseudoProgramPrerequisite extends Prerequisite {
  faculty: string | null;
  majorType: majorType | null;
  majorSystem: majorSystem | null;
}

interface DegreePrerequisite extends Prerequisite {
  degreeId: number;
}

type requisiteType = "antireq" | "prereq" | "coreq";
type requisiteSubtype =
  | "course"
  | "level"
  | "program"
  | "other"
  | "parent"
  | "pseudoCourse"
  | "pseudoProgram"
  | "degree"
  | "cumulativeAverage"
  | "majorAverage";
type averageType = "CAV" | "MAV" | "SMAV" | "TAV";
type programSubtype =
  | "Diploma"
  | "Major"
  | "Minor"
  | "Option"
  | "Specialization";
type requirementType =
  | "average"
  | "breadth"
  | "courseList"
  | "course"
  | "depth"
  | "parentCourse"
  | "term"
  | "time"
  | "unit"
  | "work"
  | "pseudoCourse";
type requirementSubtype = "Declaration" | "Graduation" | "Coop";
type majorType = "H" | "JH" | "3G" | "4G";
type unitType = "failed" | "unusable" | "minimum";
type workType = "Standard" | "Flexible";
type majorSystem = "Regular" | "Co-operative";
