import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const { revalidateTag } = await import("next/cache");
const { makeNotes, noteSchema } = await import("./notes.testutil");
const { addRecord, describeEntities, describeFailure, fieldsSchema, listEntities, listRecords, updateRecord, MAX_LIMIT, SECRET_FIELDS } = await import("./tools");

const json = (text: string) => JSON.parse(text);

describe("list_records", () => {
  const { entity } = makeNotes([
    { id: "1", title: "a", amount: 10 },
    { id: "2", title: "b", amount: 20 },
    { id: "3", title: "b", amount: 30 },
  ]);

  it("returns the rows with how many there are", async () => {
    const out = await listRecords([entity], { entity: "notes" });
    expect(out.ok).toBe(true);
    expect(json(out.text)).toMatchObject({ matching: 3, returned: 3 });
  });

  it("filters by field equality, comparing a number with its text", async () => {
    expect(json((await listRecords([entity], { entity: "notes", where: { title: "b" } })).text).matching).toBe(2);
    expect(json((await listRecords([entity], { entity: "notes", where: { amount: "20" } })).text).records[0].id).toBe("2");
  });

  it("returns the newest rows when limited, and counts them all", async () => {
    const out = json((await listRecords([entity], { entity: "notes", limit: 2 })).text);
    expect(out.records.map((row: { id: string }) => row.id)).toEqual(["2", "3"]);
    expect(out.matching).toBe(3);
  });

  it("caps the limit", async () => {
    const many = makeNotes(Array.from({ length: MAX_LIMIT + 20 }, (_, i) => ({ id: String(i), title: "x", amount: 1 })));
    expect(json((await listRecords([many.entity], { entity: "notes", limit: 99999 })).text).returned).toBe(MAX_LIMIT);
  });

  it("never returns a secret, because it reads through the route's serializer", async () => {
    const { entity: withSecret } = makeNotes([{ id: "1", title: "a", amount: 1, statementPdfPassword: "hunter2" }]);
    const text = (await listRecords([withSecret], { entity: "notes" })).text;
    expect(text).not.toContain("hunter2");
    expect(text).toContain("hasPassword");
  });

  it("says which record types exist when the name is wrong", async () => {
    const out = await listRecords([entity], { entity: "nope" });
    expect(out.ok).toBe(false);
    expect(out.text).toContain("list_entities");
  });
});

describe("add_record", () => {
  it("writes through the route: validated, saved and the cache told", async () => {
    const { entity, rows } = makeNotes();
    const out = await addRecord([entity], { entity: "notes", data: { title: "rent", amount: 5000 } });
    expect(out.ok).toBe(true);
    expect(json(out.text).added).toMatchObject({ id: "1", title: "rent", amount: 5000 });
    expect(rows).toHaveLength(1);
    expect(revalidateTag).toHaveBeenCalledWith("notes", "max");
  });

  it("refuses a row the schema rejects, names the field, and writes nothing", async () => {
    const { entity, rows } = makeNotes();
    const out = await addRecord([entity], { entity: "notes", data: { title: "", amount: -1 } });
    expect(out.ok).toBe(false);
    expect(out.text).toMatch(/Not saved/);
    expect(out.text).toContain("title");
    expect(out.text).toContain("amount");
    expect(rows).toHaveLength(0);
  });

  it("passes on a guard's refusal in words, and writes nothing", async () => {
    const { entity, rows } = makeNotes();
    const out = await addRecord([entity], { entity: "notes", data: { title: "dup", amount: 1 } });
    expect(out).toEqual({ ok: false, text: "Refused: A note called dup already exists" });
    expect(rows).toHaveLength(0);
  });

  it("will not take a secret, and writes nothing", async () => {
    const { entity, rows } = makeNotes();
    const out = await addRecord([entity], { entity: "notes", data: { title: "x", amount: 1, statementPdfPassword: "pw" } });
    expect(out.ok).toBe(false);
    expect(out.text).toContain("statementPdfPassword");
    expect(rows).toHaveLength(0);
  });

  it("says so for a record type that is never added by hand", async () => {
    const { entity } = makeNotes();
    const out = await addRecord([{ ...entity, create: undefined }], { entity: "notes", data: {} });
    expect(out.ok).toBe(false);
    expect(out.text).toContain("can't be added");
  });
});

describe("update_record", () => {
  it("changes only the fields given", async () => {
    const { entity, rows } = makeNotes([{ id: "1", title: "a", amount: 10 }]);
    const out = await updateRecord([entity], { entity: "notes", id: "1", data: { amount: 99 } });
    expect(out.ok).toBe(true);
    expect(rows[0]).toMatchObject({ title: "a", amount: 99 });
  });

  it("says not found for an id that isn't there", async () => {
    const { entity } = makeNotes();
    const out = await updateRecord([entity], { entity: "notes", id: "zzz", data: { amount: 1 } });
    expect(out.ok).toBe(false);
    expect(out.text).toMatch(/^Not found:/);
  });

  it("refuses an invalid change and a secret", async () => {
    const { entity, rows } = makeNotes([{ id: "1", title: "a", amount: 10 }]);
    expect((await updateRecord([entity], { entity: "notes", id: "1", data: { amount: -5 } })).ok).toBe(false);
    expect((await updateRecord([entity], { entity: "notes", id: "1", data: { statementPdfPassword: "pw" } })).ok).toBe(false);
    expect(rows[0].amount).toBe(10);
  });
});

describe("describeFailure", () => {
  it("reads zod's flattened errors, a string error and an unknown body", () => {
    expect(describeFailure(400, { error: { formErrors: ["bad row"], fieldErrors: { date: ["Invalid date"] } } })).toBe("Not saved. bad row; date: Invalid date");
    expect(describeFailure(500, { error: "Sheets quota" })).toBe("Sheets quota");
    expect(describeFailure(418, null)).toBe("Not saved (status 418).");
  });
});

describe("fieldsSchema and describeEntities", () => {
  it("gives the fields as JSON Schema, without a secret field", () => {
    const schema = fieldsSchema(noteSchema) as { properties: Record<string, unknown>; required: string[] };
    expect(Object.keys(schema.properties)).toEqual(["title", "amount"]);
    expect(schema.required).toEqual(["title", "amount"]);
    expect(JSON.stringify(schema)).not.toContain("statementPdfPassword");
  });

  it("lists whether each record type can be added or changed", () => {
    const { entity } = makeNotes();
    const [described] = describeEntities([entity, { ...entity, key: "ro", create: undefined, createSchema: undefined }]);
    expect(described).toMatchObject({ entity: "notes", canAdd: true, canUpdate: true });
    expect(describeEntities([{ ...entity, create: undefined }])[0].addFields).toBeNull();
  });
});

describe("list_entities", () => {
  const { entity } = makeNotes();

  it("with no argument names the record types without their fields", () => {
    const out = listEntities([entity]);
    expect(out.ok).toBe(true);
    expect(json(out.text)).toEqual([{ entity: "notes", label: "Notes", about: "A test note.", canAdd: true, canUpdate: true }]);
  });

  it("with an entity gives that type's fields, and nothing of the others", () => {
    const other = { ...entity, key: "other", about: "Another one." };
    const out = json(listEntities([entity, other], "notes").text);
    expect(out.entity).toBe("notes");
    expect(Object.keys(out.addFields.properties)).toEqual(["title", "amount"]);
    expect(listEntities([entity, other], "notes").text).not.toContain("Another one");
  });

  it("says which types exist for a name that isn't one", () => {
    const out = listEntities([entity], "nope");
    expect(out.ok).toBe(false);
    expect(out.text).toContain("list_entities");
  });
});

describe("secret fields", () => {
  it("include the statement PDF password and the whole policy number", () => {
    expect(SECRET_FIELDS).toEqual(expect.arrayContaining(["statementPdfPassword", "policyNumber"]));
  });

  it("refuse a policy number on add and on update, writing nothing", async () => {
    const { entity, rows } = makeNotes([{ id: "1", title: "a", amount: 1 }]);
    expect((await addRecord([entity], { entity: "notes", data: { title: "x", amount: 1, policyNumber: "ABC123456789" } })).text).toContain("policyNumber");
    expect((await updateRecord([entity], { entity: "notes", id: "1", data: { policyNumber: "ABC123456789" } })).ok).toBe(false);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("ABC123456789");
  });
});
