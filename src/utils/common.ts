export default class Common {
  public static sleep(millisecond: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, millisecond));
  }
}
