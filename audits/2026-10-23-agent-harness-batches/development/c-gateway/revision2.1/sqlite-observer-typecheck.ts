import type {DatabaseSync, SQLInputValue, StatementResultingChanges} from "node:sqlite";
declare const db: DatabaseSync; declare const stage: string; declare function pause(stage:string):void;
function isNamedParameters(
  value: SQLInputValue | Record<string, SQLInputValue>,
): value is Record<string, SQLInputValue> {
  return value !== null && typeof value === "object" && !ArrayBuffer.isView(value);
}
const prepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const statement = prepare(sql),
    run = statement.run.bind(statement);
  function observedRun(...parameters: SQLInputValue[]): StatementResultingChanges;
  function observedRun(
    named: Record<string, SQLInputValue>,
    ...parameters: SQLInputValue[]
  ): StatementResultingChanges;
  function observedRun(
    first?: SQLInputValue | Record<string, SQLInputValue>,
    ...parameters: SQLInputValue[]
  ): StatementResultingChanges {
    const result =
      first === undefined
        ? run()
        : isNamedParameters(first)
          ? run(first, ...parameters)
          : run(first, ...parameters);
    if (sql.startsWith("UPDATE classification_work SET suggestion_json=")) {
      if (typeof first !== "string") {
        throw Error("expected serialized suggestion");
      }
      const value = JSON.parse(first) as { state: string };
      if (stage === "admitted" && value.state === "admitted") {
        pause(stage);
      }
      if (stage === "received" && value.state === "received") {
        pause(stage);
      }
    }
    return result;
  }
  statement.run = observedRun;
  return statement;
};

db.prepare("SELECT ?").run(1);db.prepare("SELECT $value").run({value:1});
