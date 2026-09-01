const { withPodfile } = require("expo/config-plugins");

/** Turn off react-native-firebase's Swift Package Manager path.
 *
 *  From v26 it resolves firebase-ios-sdk through SPM. Those products are
 *  automatic libraries rather than dynamic ones, so every react-native-firebase
 *  pod embeds its own copy of Firebase and they collide at link time as
 *  duplicate symbols. The pods autolink from node_modules whether or not the
 *  Firebase config plugins are active, so this has to apply unconditionally —
 *  a build with the packages installed but not configured hit it just the same.
 *
 *  react-native-firebase's own error names this as the fix. It has to sit
 *  above every target block, hence prepending.
 */
module.exports = function withRNFirebaseNoSPM(config) {
  return withPodfile(config, (cfg) => {
    const flag = "$RNFirebaseDisableSPM = true";
    if (!cfg.modResults.contents.includes(flag)) {
      cfg.modResults.contents = `${flag}\n\n${cfg.modResults.contents}`;
    }
    return cfg;
  });
};
