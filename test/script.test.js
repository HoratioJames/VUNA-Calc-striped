const fs = require("fs");
const path = require("path");

const scriptCode = fs.readFileSync(
  path.resolve(__dirname, "../assets/js/script.js"),
  "utf8",
);

beforeAll(() => {
  document.body.innerHTML = `<input type="text" id="result" />`;
  const script = document.createElement("script");
  script.textContent = scriptCode;
  document.body.appendChild(script);
});

beforeEach(() => {
  const input = document.getElementById("result");
  if (input) input.value = "0";
  globalThis.LAST_RESULT = 0;
  globalThis.currentExpression = "";
});

describe("normalizeExpression", () => {
  test("replaces sin( with sinDeg(", () => {
    expect(normalizeExpression("sin(30)")).toBe("sinDeg(30)");
  });

  test("replaces cos( with cosDeg(", () => {
    expect(normalizeExpression("cos(45)")).toBe("cosDeg(45)");
  });

  test("replaces tan( with tanDeg(", () => {
    expect(normalizeExpression("tan(60)")).toBe("tanDeg(60)");
  });

  test("replaces asin( with asinDeg(", () => {
    expect(normalizeExpression("asin(0.5)")).toBe("asinDeg(0.5)");
  });

  test("replaces acos( with acosDeg(", () => {
    expect(normalizeExpression("acos(0.5)")).toBe("acosDeg(0.5)");
  });

  test("replaces atan( with atanDeg(", () => {
    expect(normalizeExpression("atan(1)")).toBe("atanDeg(1)");
  });

  test("keeps asinh( unchanged", () => {
    expect(normalizeExpression("asinh(1)")).toBe("asinh(1)");
  });

  test("keeps sinh( unchanged", () => {
    expect(normalizeExpression("sinh(1)")).toBe("sinh(1)");
  });

  test("replaces standalone e with Math.E", () => {
    expect(normalizeExpression("e")).toBe("Math.E");
  });

  test("replaces standalone pi with Math.PI", () => {
    expect(normalizeExpression("pi")).toBe("Math.PI");
  });

  test("does not replace e inside a word", () => {
    expect(normalizeExpression("exp(2)")).toBe("exp(2)");
  });

  test("does not replace pi inside a word", () => {
    expect(normalizeExpression("spin(2)")).toBe("spin(2)");
  });

  test("handles mixed expression", () => {
    expect(normalizeExpression("sin(30)+cos(45)*pi")).toBe(
      "sinDeg(30)+cosDeg(45)*Math.PI",
    );
  });
});

describe("calculateExpression", () => {
  test("adds two numbers", () => {
    expect(calculateExpression("2+3")).toBe(5);
  });

  test("subtracts two numbers", () => {
    expect(calculateExpression("10-4")).toBe(6);
  });

  test("multiplies two numbers", () => {
    expect(calculateExpression("3*4")).toBe(12);
  });

  test("divides two numbers", () => {
    expect(calculateExpression("8/2")).toBe(4);
  });

  test("respects operator precedence", () => {
    expect(calculateExpression("2+3*4")).toBe(14);
  });

  test("handles parentheses", () => {
    expect(calculateExpression("(2+3)*4")).toBe(20);
  });

  test("handles decimal numbers", () => {
    expect(calculateExpression("3.5+2.1")).toBeCloseTo(5.6);
  });

  test("replaces ans with last result", () => {
    LAST_RESULT = 10;
    expect(calculateExpression("ans+5")).toBe(15);
  });

  test("replaces ANS with last result (case insensitive)", () => {
    LAST_RESULT = 7;
    expect(calculateExpression("ANS*2")).toBe(14);
  });

  test("handles exponentiation", () => {
    expect(calculateExpression("2**3")).toBe(8);
  });

  test("returns Error for invalid expression", () => {
    expect(calculateExpression("1+/2")).toBe("Error");
  });

  test("returns Error for division by zero", () => {
    expect(calculateExpression("1/0")).toBe("Error");
  });

  test("returns Error for NaN result", () => {
    expect(calculateExpression("undefinedVar")).toBe("Error");
  });

  test("handles expressions with pi", () => {
    const result = calculateExpression("pi*2");
    expect(result).toBeCloseTo(6.283185, 5);
  });

  test("handles expressions with e", () => {
    const result = calculateExpression("e*2");
    expect(result).toBeCloseTo(5.4365636, 5);
  });

  test("returns Error when expression is empty-like", () => {
    expect(calculateExpression("   ")).toBe("Error");
  });

  test("uses Math.PI constant", () => {
    const result = calculateExpression("Math.PI");
    expect(result).toBeCloseTo(Math.PI, 5);
  });

  test("handles nested Math.pow", () => {
    const result = calculateExpression("Math.pow(2,3)");
    expect(result).toBe(8);
  });
});

describe("appendToResult", () => {
  test("appends a digit to currentExpression", () => {
    appendToResult(5);
    expect(currentExpression).toBe("5");
  });

  test("appends multiple digits", () => {
    appendToResult(1);
    appendToResult(2);
    appendToResult(3);
    expect(currentExpression).toBe("123");
  });

  test("appends a decimal point", () => {
    appendToResult(3);
    appendToResult(".");
    appendToResult(14);
    expect(currentExpression).toBe("3.14");
  });

  test("updates the result input value", () => {
    appendToResult(42);
    expect(document.getElementById("result").value).toBe("42");
  });
});

describe("bracketToResult", () => {
  test("appends opening bracket", () => {
    bracketToResult("(");
    expect(currentExpression).toBe("(");
  });

  test("appends closing bracket after expression", () => {
    currentExpression = "2+3";
    bracketToResult(")");
    expect(currentExpression).toBe("2+3)");
  });
});

describe("backspace", () => {
  test("removes the last character", () => {
    currentExpression = "123";
    backspace();
    expect(currentExpression).toBe("12");
  });

  test("does nothing on empty expression", () => {
    backspace();
    expect(currentExpression).toBe("");
  });

  test("updates display after backspace", () => {
    currentExpression = "99";
    backspace();
    expect(document.getElementById("result").value).toBe("9");
  });
});

describe("operatorToResult", () => {
  test("appends + operator", () => {
    currentExpression = "3";
    operatorToResult("+");
    expect(currentExpression).toBe("3+");
  });

  test("converts ^ to **", () => {
    currentExpression = "2";
    operatorToResult("^");
    expect(currentExpression).toBe("2**");
  });

  test("appends - operator", () => {
    currentExpression = "5";
    operatorToResult("-");
    expect(currentExpression).toBe("5-");
  });

  test("appends * operator", () => {
    currentExpression = "4";
    operatorToResult("*");
    expect(currentExpression).toBe("4*");
  });

  test("appends / operator", () => {
    currentExpression = "8";
    operatorToResult("/");
    expect(currentExpression).toBe("8/");
  });

  test("updates display", () => {
    currentExpression = "7";
    operatorToResult("+");
    expect(document.getElementById("result").value).toBe("7+");
  });
});

describe("clearResult", () => {
  test("clears currentExpression", () => {
    currentExpression = "42+58";
    clearResult();
    expect(currentExpression).toBe("");
  });

  test("resets display to 0", () => {
    currentExpression = "hello";
    clearResult();
    expect(document.getElementById("result").value).toBe("0");
  });
});

describe("percentToResult", () => {
  test("converts a plain number to percentage", () => {
    currentExpression = "200";
    percentToResult();
    expect(currentExpression).toBe("2*");
  });

  test("returns early on empty expression", () => {
    currentExpression = "";
    percentToResult();
    expect(currentExpression).toBe("");
  });

  test("handles percentage of another number (200+10%)", () => {
    currentExpression = "200+10";
    percentToResult();
    expect(currentExpression).toBe("20*");
  });

  test("handles percentage of another number (100*20%)", () => {
    currentExpression = "100*20";
    percentToResult();
    expect(currentExpression).toBe("20*");
  });
});

describe("calculateResult", () => {
  test("calculates and updates display", () => {
    currentExpression = "2+3";
    calculateResult();
    expect(document.getElementById("result").value).toBe("5");
  });

  test("stores result in LAST_RESULT", () => {
    currentExpression = "10*10";
    calculateResult();
    expect(LAST_RESULT).toBe("100");
  });

  test("sets currentExpression to result after calculation", () => {
    currentExpression = "7-3";
    calculateResult();
    expect(currentExpression).toBe("4");
  });

  test("does nothing on empty expression", () => {
    calculateResult();
    expect(document.getElementById("result").value).toBe("0");
  });

  test("shows Error for invalid expression", () => {
    currentExpression = "1/0";
    calculateResult();
    expect(document.getElementById("result").value).toBe("Error");
  });
});
