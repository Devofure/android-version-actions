const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

// versionCode — A positive integer [...] -> https://developer.android.com/studio/publish/versioning
const versionCodeRegexPattern = /(versionCode(?:\s|=)*)(.*)/;
// versionName — A string used as the version number shown to users [...] -> https://developer.android.com/studio/publish/versioning
const versionNameRegexPattern = /(versionName(?:\s|=)*)(.*)/;
// A string used to match the major.minor.ptach and exclude stage version -> https://en.wikipedia.org/wiki/Software_versioning
const versionWithoutStageRegexPattern = /\d+(\.\d+){2,}/;

try {
    const gradlePath = core.getInput('gradlePath');
    const versionCode = core.getInput('versionCode');
    const versionCodeLimiter = core.getInput('versionCodeLimiter');
    const versionName = core.getInput('versionName');
    const versionStage = core.getInput('versionStage');
    const versionMetaInfo = core.getInput('versionMetaInfo') || '';


    console.log(`Gradle Path : ${gradlePath}`);
    console.log(`Version Code : ${versionCode}`);
    console.log(`Version Name : ${versionName}`);
    console.log(`Version stage : ${versionStage}`);
    console.log(`Version meta info : ${versionMetaInfo}`);

    fs.readFile(gradlePath, 'utf8', function (err, data) {
        newGradle = data;
        if (versionCode && versionCode.length > 0) {
            console.log(`Trying to set version code ${versionCode}`)
            newGradle = newGradle.replace(versionCodeRegexPattern, `$1${versionCode}`);
        }
        else {
            const lastVersionCodeStr = newGradle.match(versionCodeRegexPattern)[2];
            const newVersionCode = parseInt(lastVersionCodeStr) + 1;
            console.log(`Trying to set version code ${newVersionCode}`)
            newGradle = newGradle.replace(versionCodeRegexPattern, `$1${newVersionCode}`);
        }

        currentVersionCode = newGradle.match(versionCodeRegexPattern)[2]
        const currentVersionCodeStr = currentVersionCode.toString();
        if (versionCodeLimiter && versionCodeLimiter > 0) {
            currentVersionCode = parseInt(currentVersionCodeStr.slice(-versionCodeLimiter));
        }

        if (versionName && versionName.length > 0) {
            if (versionStage && versionStage.length > 0) {
                const newVersion = versionName + '-' + versionStage + '.' + currentVersionCode + versionMetaInfo
                console.log(`Trying to set version name ${newVersion}`);
                newGradle = newGradle.replace(versionNameRegexPattern, `$1\"${newVersion}\"`);
            } else {
                console.log(`Trying to set version name ${versionName}`);
                newGradle = newGradle.replace(versionNameRegexPattern, `$1\"${versionName}\"`);
            }
        } else {
                const currentRawVersionName = newGradle.match(versionNameRegexPattern)[2].replace(/['"]+/g, '');
                const currentVersionName = currentRawVersionName.match(versionWithoutStageRegexPattern)[0];
			if (versionStage && versionStage.length > 0) {
                const newVersion = currentVersionName + '-' + versionStage + '.' + currentVersionCode + versionMetaInfo;
                console.log(`Trying to set version name ${newVersion}`);
                newGradle = newGradle.replace(versionNameRegexPattern, `$1\"${newVersion}\"`);
			} else { //only add meta info
                const newVersion = currentRawVersionName + versionMetaInfo;
                console.log(`Trying to set version name ${newVersion}`);
                newGradle = newGradle.replace(versionNameRegexPattern, `$1\"${newVersion}\"`);
			}
        }

        //set output
        const lastestVersionCode = newGradle.match(versionCodeRegexPattern)[2];
        console.log(`VersionCode in Gradle: ${lastestVersionCode}`);
		core.setOutput("lastestVersionCode", `${lastestVersionCode}`);

		const latestVersionName = newGradle.match(versionNameRegexPattern)[2];
        console.log(`VersionName in Gradle: ${latestVersionName}`);
        core.setOutput("latestVersionName", `${latestVersionName}`);

        const latestVersionNameWithoutStageMatch = latestVersionName.match(versionWithoutStageRegexPattern);
        if(latestVersionNameWithoutStageMatch.length > 0) {
            const latestVersionNameWithoutStage = latestVersionNameWithoutStageMatch[0];
            core.setOutput("latestVersionNameWithoutStage", `${latestVersionNameWithoutStage}`);
			console.log(`latestVersionNameWithoutStage in Gradle: ${latestVersionName}`);
        }
        
        fs.writeFile(gradlePath, newGradle, function (err) {
            if (err) throw err;
            console.log(`Successfully override the file`)
            core.setOutput("result", `Done`);
        });
    });

} catch (error) {
    core.setFailed(error.message);
}
