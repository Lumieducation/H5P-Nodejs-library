/**
 * Stores information about H5P libraries.
 */
class Library {
  constructor(machineName, major, minor, patch, restricted = false) {
      this.machineName = machineName;
      this.majorVersion = major;
      this.minorVersion = minor;
      this.patchVersion = patch;
      this.id = undefined;
      this.title = undefined;
      this.runnable = undefined;
      this.restricted = restricted;
  }

  /**
   * Compares libraries by giving precedence to title, then major version, then minor version 
   * @param {Library} otherLibrary 
   */
  compare(otherLibrary) {
      return this.title.localeCompare(otherLibrary.title) || this.majorVersion - otherLibrary.majorVersion || this.minorVersion - otherLibrary.minorVersion;
  }

  /**
   * Compares libraries by giving precedence to major version, then minor version, then patch version. 
   * @param {Library} otherLibrary 
   */
  compareVersions(otherLibrary) {
      return this.majorVersion - otherLibrary.majorVersion || this.minorVersion - otherLibrary.minorVersion || this.patchVersion - otherLibrary.patchVersion;
  }

  /**
   * Returns the directory name that is used for this library (e.g. H5P.ExampleLibrary-1.0)
   */
  getDirName() {
      return `${this.machineName}-${this.majorVersion}.${this.minorVersion}`;
  }
}

module.exports = Library;