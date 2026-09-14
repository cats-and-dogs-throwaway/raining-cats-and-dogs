import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import {
  JsonDepthLimitError,
  replaceDogs,
  type JsonValue,
} from "../src/replace-dogs.js";

describe("string values", () => {
  it("returns cat when the input is dog and one replacement is allowed", () => {
    const input = "dog";
    const maxReplacements = 1;
    const expectedResult = "cat";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("returns cat when the allowance exceeds the number of matches", () => {
    const input = "dog";
    const maxReplacements = 2;
    const expectedResult = "cat";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("returns dog when no replacements are allowed", () => {
    const input = "dog";
    const maxReplacements = 0;
    const expectedResult = "dog";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("returns mouse when the input does not match dog and one replacement is allowed", () => {
    const input = "mouse";
    const maxReplacements = 1;
    const expectedResult = "mouse";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("returns Dog when the input differs from dog in case", () => {
    const input = "Dog";
    const maxReplacements = 1;
    const expectedResult = "Dog";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("preserves whitespace when dog has surrounding spaces", () => {
    const input = " dog ";
    const maxReplacements = 1;
    const expectedResult = " dog ";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("returns an empty string when the input is an empty string", () => {
    const input = "";
    const maxReplacements = 1;
    const expectedResult = "";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });

  it("returns dogdog when dog is repeated within one string", () => {
    const input = "dogdog";
    const maxReplacements = 1;
    const expectedResult = "dogdog";

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, expectedResult);
  });
});

describe("array values", () => {
  it("replaces only the first matching array value when one replacement is allowed", () => {
    const input = ["mouse", "dog", "dog"];
    const maxReplacements = 1;
    const expectedResult = ["mouse", "cat", "dog"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("replaces only the first two matching array values when two replacements are allowed", () => {
    const input = ["dog", "mouse", "dog", "dog"];
    const maxReplacements = 2;
    const expectedResult = ["cat", "mouse", "cat", "dog"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("preserves array values when none match dog and replacements are allowed", () => {
    const input = ["mouse", "cat"];
    const maxReplacements = 2;
    const expectedResult = ["mouse", "cat"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("preserves matching array values when no replacements are allowed", () => {
    const input = ["dog"];
    const maxReplacements = 0;
    const expectedResult = ["dog"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("returns an empty array when the input array is empty", () => {
    const input: JsonValue[] = [];
    const maxReplacements = 2;
    const expectedResult: JsonValue[] = [];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("preserves non-string array values when replacing a matching string", () => {
    const input = [null, 11, false, "dog"];
    const maxReplacements = 1;
    const expectedResult = [null, 11, false, "cat"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("replaces the first two matches depth-first when arrays are nested", () => {
    const input = ["dog", ["dog", "dog"], "dog"];
    const maxReplacements = 2;
    const expectedResult = ["cat", ["cat", "dog"], "dog"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("resumes replacement in the outer array when allowance remains after visiting a nested array", () => {
    const input = [[], ["dog"], "mouse", "dog"];
    const maxReplacements = 2;
    const expectedResult = [[], ["cat"], "mouse", "cat"];

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("gives each call a fresh allowance when replacing values in separate inputs", () => {
    const firstInput = ["dog", "dog"];
    const secondInput = ["dog", "dog"];
    const maxReplacements = 1;
    const expectedFirstResult = ["cat", "dog"];
    const expectedSecondResult = ["cat", "dog"];

    const firstResult = replaceDogs(firstInput, maxReplacements);
    const secondResult = replaceDogs(secondInput, maxReplacements);

    deepStrictEqual(firstResult, expectedFirstResult);
    deepStrictEqual(secondResult, expectedSecondResult);
  });
});

describe("object values", () => {
  it("replaces only the first matching object value when one replacement is allowed", () => {
    const input = { dog: "mouse", zebra: "dog", animals: "dog" };
    const maxReplacements = 1;
    const expectedResult = { dog: "mouse", zebra: "cat", animals: "dog" };

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("replaces the value at the lowest array-index key when one replacement is allowed", () => {
    const input = { "10": "dog", "2": "dog", animals: "dog" };
    const maxReplacements = 1;
    const expectedResult = { "10": "dog", "2": "cat", animals: "dog" };

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("resumes replacement in the outer object when allowance remains after visiting a nested object", () => {
    const input = { animals: { first: "dog" }, last: "dog" };
    const maxReplacements = 2;
    const expectedResult = { animals: { first: "cat" }, last: "cat" };

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("preserves special keys when replacing their JSON string values", () => {
    const input: JsonValue = JSON.parse(
      '{"__proto__":"dog","constructor":"dog","prototype":"dog","animals":"dog"}',
    );
    const maxReplacements = 3;
    const expectedResult: JsonValue = JSON.parse(
      '{"__proto__":"cat","constructor":"cat","prototype":"cat","animals":"dog"}',
    );

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("replaces the first two matches depth-first when objects and arrays are nested", () => {
    const input = {
      animals: ["dog", { animals: "dog" }],
      last: "dog",
    };
    const maxReplacements = 2;
    const expectedResult = {
      animals: ["cat", { animals: "cat" }],
      last: "dog",
    };

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });

  it("preserves empty containers and dotted keys when replacing mixed object values", () => {
    const input = {
      emptyObject: {},
      emptyArray: [],
      "animals.dog": "dog",
      nested: { count: 2, enabled: false, absent: null },
    };
    const maxReplacements = 1;
    const expectedResult = {
      emptyObject: {},
      emptyArray: [],
      "animals.dog": "cat",
      nested: { count: 2, enabled: false, absent: null },
    };

    const actualResult = replaceDogs(input, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });
});

describe("in-place mutation", () => {
  it("updates the original object and nested containers without replacing their references", () => {
    const animal = { name: "dog" };
    const animals = ["dog"];
    const input = { animal, animals };
    const maxReplacements = 2;
    const expectedInput = {
      animal: { name: "cat" },
      animals: ["cat"],
    };

    const actualResult = replaceDogs(input, maxReplacements);

    strictEqual(actualResult, input);
    strictEqual(input.animal, animal);
    strictEqual(input.animals, animals);
    deepStrictEqual(input, expectedInput);
  });
});

describe("depth validation", () => {
  it("rejects excessive nesting when no replacements are allowed", () => {
    const arrayLevelsInsideRootObject = 100;
    const payloadBeyondDepthLimit = {
      animals: wrapInArrays("dog", arrayLevelsInsideRootObject),
    };
    const maxReplacements = 0;

    throws(
      () => replaceDogs(payloadBeyondDepthLimit, maxReplacements),
      JsonDepthLimitError,
    );
  });

  it("rejects excessive nesting before changing earlier matches when replacements are allowed", () => {
    const arrayLevelsInsideRootArray = 100;
    const input = ["dog", wrapInArrays("mouse", arrayLevelsInsideRootArray)];
    const maxReplacements = 1;
    const expectedUnchangedInput = [
      "dog",
      wrapInArrays("mouse", arrayLevelsInsideRootArray),
    ];

    throws(() => replaceDogs(input, maxReplacements), JsonDepthLimitError);

    deepStrictEqual(input, expectedUnchangedInput);
  });

  it("replaces the deepest match when combined array and object nesting is exactly 100 levels", () => {
    const arrayLevelsInsideRootObject = 99;
    const payloadAtDepthLimit = {
      animals: wrapInArrays("dog", arrayLevelsInsideRootObject),
    };
    const maxReplacements = 1;
    const expectedResult = {
      animals: wrapInArrays("cat", arrayLevelsInsideRootObject),
    };

    const actualResult = replaceDogs(payloadAtDepthLimit, maxReplacements);

    deepStrictEqual(actualResult, expectedResult);
  });
});

function wrapInArrays(value: JsonValue, arrayLevels: number): JsonValue {
  let nestedValue = value;

  for (let i = 0; i < arrayLevels; i++) {
    nestedValue = [nestedValue];
  }

  return nestedValue;
}
