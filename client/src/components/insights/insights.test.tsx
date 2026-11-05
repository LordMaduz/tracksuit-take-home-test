import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Insights } from "./insights.tsx";

const TEST_INSIGHTS = [
  {
    brand: 1,
    createdAt: new Date(),
    text: "Test insight",
  },
  { brand: 2, createdAt: new Date(), text: "Another test insight" },
];

describe("insights", () => {
  it("renders", () => {
    const { getByText } = render(<Insights insights={TEST_INSIGHTS} />);
    expect(getByText(TEST_INSIGHTS[0].text)).toBeTruthy();
  });
});
