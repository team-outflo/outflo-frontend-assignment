export function toISODuration(value: number, unit: string): string {
  switch (unit) {
    case "hours":
      return `PT${value}H`;
    case "days":
      return `P${value}D`;
    case "weeks":
      return `P${value}W`;
    case "months":
      return `P${value}M`;
    case "years":
      return `P${value}Y`;
    default:
      return "";
  }
}

