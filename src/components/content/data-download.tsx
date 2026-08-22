import { Card } from "@/components/ui";

/**
 * The download strip for a page whose figures are also published as data.
 *
 * A chart is an argument and a table is a rendering; neither can be checked
 * without retyping. These links are the evidence, and putting them on the page
 * rather than only in the API documentation is the difference between data
 * that is published and data that is technically available.
 *
 * Plain `<a download>` links to real endpoints — no client JavaScript, no
 * blob built in the browser, so they work with scripting off and the file is
 * the same whether a person or a script fetches it.
 *
 * The limitations are shown next to the links rather than inside the files.
 * A caveat that lives only in a header block stops travelling with the data
 * the first time someone opens it in a spreadsheet, and the point of stating
 * them here is that nobody downloads a range without reading what it covers.
 */
export function DataDownload({
  heading,
  description,
  formats,
  limitations,
}: {
  heading: string;
  description: string;
  formats: readonly { readonly label: string; readonly href: string }[];
  limitations: readonly string[];
}) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-(--color-text)">{heading}</h3>
      <p className="mt-2 text-sm text-(--color-text-muted)">{description}</p>

      <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
        {formats.map((format) => (
          <li key={format.href}>
            <a
              href={format.href}
              download
              className="inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) hover:bg-(--color-surface-subtle) hover:text-(--color-primary)"
            >
              {format.label}
            </a>
          </li>
        ))}
      </ul>

      <ul className="mt-4 flex list-none flex-col gap-1.5 p-0 text-sm text-(--color-text-muted)">
        {limitations.map((limitation) => (
          <li key={limitation} className="flex gap-2">
            <span aria-hidden="true">·</span>
            <span>{limitation}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
