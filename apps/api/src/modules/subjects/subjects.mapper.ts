import { Subject } from "../../db/schema.js";
import { SubjectResponse } from "./subjects.types.js";

export function toSubjectResponse(subject: Subject): SubjectResponse {
  return {
    id: subject.id,
    name: subject.name,
  };
}
