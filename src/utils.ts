export function toTwoDigits(num: number | undefined) {
  if (!num) {
    return '00';
  }

  const numLength = String(num).length;

  if (numLength === 1) {
    return num + '0';
  }

  return String(num);
}
