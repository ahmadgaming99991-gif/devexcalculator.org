import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Table, Td, Th } from "@/components/ui";

/**
 * Wide tables have to be readable on a phone without scrolling sideways.
 *
 * The stacked layout is CSS, but it only works because `Table` puts each
 * column's name on every body cell as `data-label` — that is what a reader
 * sees beside the value once the header row is off-screen. If the labels stop
 * being derived, the CSS still stacks and the table silently becomes a column
 * of unlabelled numbers, which is worse than the scrolling it replaced.
 *
 * So this holds the derivation, not the appearance: the right label on the
 * right cell, the roles that keep it a table once `display: block` has taken
 * its implicit ones away, and the rule about which tables stack at all.
 */

const render = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

/** Attributes of the `<td>`/`<th>` cells in document order. */
function cells(markup: string): { label: string | null; role: string | null }[] {
  return [...markup.matchAll(/<(?:td|th)\b([^>]*)>/g)].map((match) => {
    const attributes = match[1] ?? "";
    return {
      label: /data-label="([^"]*)"/.exec(attributes)?.[1] ?? null,
      role: /role="([^"]*)"/.exec(attributes)?.[1] ?? null,
    };
  });
}

const wide = (
  <Table caption="Rates">
    <thead>
      <tr>
        <Th>Earned Robux</Th>
        <Th numeric>Standard</Th>
        <Th numeric>Legacy</Th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <Th scope="row">30,000</Th>
        <Td numeric>$114.00</Td>
        <Td numeric>$105.00</Td>
      </tr>
    </tbody>
  </Table>
);

describe("responsive table", () => {
  it("labels every body cell with its own column heading", () => {
    const body = cells(render(wide)).filter((cell) => cell.label !== null);
    expect(body.map((cell) => cell.label)).toEqual(["Standard", "Legacy"]);
  });

  it("does not label the header row with itself", () => {
    // The header cells are the source of the labels; carrying one would print
    // "Standard" above "Standard" in the stacked layout.
    const markup = render(wide);
    const head = markup.slice(markup.indexOf("<thead"), markup.indexOf("</thead>"));
    expect(head).not.toContain("data-label");
  });

  it("leaves the row header unlabelled, because it is the row's heading", () => {
    const rowHeader = cells(render(wide)).find((cell) => cell.role === "rowheader");
    expect(rowHeader?.label).toBeNull();
  });

  it("marks a wide table for stacking", () => {
    expect(render(wide)).toContain("data-stack");
  });

  it("keeps the table a table once the CSS drops it to display:block", () => {
    const markup = render(wide);
    // Without these, stacking removes rows and columns from the accessibility
    // tree entirely and the data stops being navigable.
    expect(markup).toContain('role="table"');
    expect(markup).toContain('role="rowgroup"');
    expect(markup).toContain('role="row"');
    expect(cells(markup).map((cell) => cell.role)).toEqual([
      "columnheader",
      "columnheader",
      "columnheader",
      "rowheader",
      "cell",
      "cell",
    ]);
  });

  it("leaves a narrow table alone, which already reads as label and value", () => {
    const narrow = render(
      <Table caption="Fees">
        <thead>
          <tr>
            <Th>Item</Th>
            <Th numeric>Amount</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Th scope="row">Marketplace fee</Th>
            <Td numeric>30%</Td>
          </tr>
        </tbody>
      </Table>,
    );
    expect(narrow).not.toContain("data-stack");
    expect(narrow).not.toContain("data-label");
  });

  it("reads a label out of a header that wraps its text in an element", () => {
    const nested = render(
      <Table caption="Rates">
        <thead>
          <tr>
            <Th>Rate</Th>
            <Th numeric>
              <span>Per 1,000</span>
            </Th>
            <Th numeric>Per 30,000</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Th scope="row">Standard</Th>
            <Td numeric>$3.80</Td>
            <Td numeric>$114.00</Td>
          </tr>
        </tbody>
      </Table>,
    );
    expect(cells(nested).find((cell) => cell.role === "cell")?.label).toBe("Per 1,000");
  });

  it("keeps a label a caller set explicitly", () => {
    const overridden = render(
      <Table caption="Rates">
        <thead>
          <tr>
            <Th>A</Th>
            <Th>B</Th>
            <Th>C</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Th scope="row">Row</Th>
            <Td label="Chosen">1</Td>
            <Td>2</Td>
          </tr>
        </tbody>
      </Table>,
    );
    const values = cells(overridden).filter((cell) => cell.role === "cell");
    expect(values.map((cell) => cell.label)).toEqual(["Chosen", "C"]);
  });

  it("sees through a fragment wrapping the rows", () => {
    /*
     * The shape the marketplace calculator uses: a conditional in `<tbody>`
     * returning a fragment of rows. `Children.toArray` counts that fragment as
     * one child, so before it was flattened the walk mistook it for a row and
     * its rows for cells — and shipped `<tr label="Goes to">` to the browser.
     */
    const fragmented = render(
      <Table caption="Split">
        <thead>
          <tr>
            <Th>Goes to</Th>
            <Th numeric>Robux</Th>
            <Th numeric>Share</Th>
          </tr>
        </thead>
        <tbody>
          <>
            <tr>
              <Th scope="row">You</Th>
              <Td numeric>70</Td>
              <Td numeric>70%</Td>
            </tr>
            <tr>
              <Th scope="row">Roblox</Th>
              <Td numeric>30</Td>
              <Td numeric>30%</Td>
            </tr>
          </>
        </tbody>
      </Table>,
    );

    expect(fragmented).not.toContain("<tr label");
    expect(fragmented.match(/<tr role="row">/g)).toHaveLength(3);
    const values = cells(fragmented).filter((cell) => cell.role === "cell");
    expect(values.map((cell) => cell.label)).toEqual(["Robux", "Share", "Robux", "Share"]);
  });

  it("survives rows built by a map, which arrive as an array child", () => {
    const mapped = render(
      <Table caption="Amounts">
        <thead>
          <tr>
            <Th>Amount</Th>
            <Th numeric>USD</Th>
            <Th numeric>Legacy</Th>
          </tr>
        </thead>
        <tbody>
          {[30_000, 50_000].map((amount) => (
            <tr key={amount}>
              <Th scope="row">{amount}</Th>
              <Td numeric>a</Td>
              <Td numeric>b</Td>
            </tr>
          ))}
        </tbody>
      </Table>,
    );
    const values = cells(mapped).filter((cell) => cell.role === "cell");
    expect(values.map((cell) => cell.label)).toEqual(["USD", "Legacy", "USD", "Legacy"]);
  });
});
