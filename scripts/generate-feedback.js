const fs = require('fs');
const path = require('path');

console.log(process.argv);

const args = process.argv.slice(2);

const TOKEN = args[0];
const LANG = args[1] || 'ua';
const BUILD = process.env.BUILD_NUMBER;

const PATH_TO_REPORT = args[2];
const CODE_STYLE_REPORT = args[3];

const localizations = {
    ua: require('./localization/ua'),
    ru: require('./localization/ru'),
};
const localization = localizations[LANG] || localizations['ua'];

if (!fs.existsSync(PATH_TO_REPORT)) {
    generateResult(localization.REPORT_ERROR);
    process.exit(1);
}

if (!fs.existsSync(CODE_STYLE_REPORT)) {
    generateResult(localization.CODE_STYLE_REPORT_ERROR);
    process.exit(1);
}

try {
    const MAX_TESTS_SCORE = 7;
    const MAX_CODE_STYLE_SCORE = 1;
    const MAX_SCORE = MAX_CODE_STYLE_SCORE + MAX_TESTS_SCORE;
    const parsedTestResult = parseTestResult(fs.readFileSync(PATH_TO_REPORT).toString());
    const testResult = convertSchemaToFeedback(getTestSchema(parsedTestResult), MAX_TESTS_SCORE);
    const linterResult = parseLinterResult(fs.readFileSync(CODE_STYLE_REPORT).toString(), MAX_CODE_STYLE_SCORE);
    const finalMark = linterResult.mark + testResult.mark;
    let resultPhrase = '';

    if (finalMark === MAX_SCORE) {
        resultPhrase = localization.BEST_RESULT;
    } else if ((finalMark / MAX_SCORE) > 0.5) {
        resultPhrase = localization.GOOD_RESULT;
    } else {
        resultPhrase = localization.BAD_RESULT;
    }

    let resultFeedback = localization.GREETINGS + '\n'
        + localization.UNIT_TESTS + '\n\n'
        + testResult.trace + '\n\n'
        + localization.CODE_STYLE + '\n\n'
        + linterResult.trace + '\n\n'
        + localization.FINAL_WORDS.replace('$\{score\}', finalMark.toFixed(2) + '/' + MAX_SCORE)
        + resultPhrase + '\n\n'
        + localization.FINAL;

    generateResult(resultFeedback, finalMark.toFixed(2));
} catch (e) {
    console.error(e);
    generateResult(localization.SOMETHING_WENT_WRONG);
    process.exit(1);
}

function parseLinterResult(linterData, score) {
    const pathToFolder = path.resolve(__dirname, '..', 'temp-repo').replace(/\//g, '\\\\/');
    const linterResult = JSON.parse(linterData.replace(new RegExp(pathToFolder, 'g'), ''));
    
    if (linterResult.files.length === 0) {
        return {
            trace: localization.CODE_STYLE_IS_GOOD,
            mark: score,
        };
    }

    const trace = linterResult.files.reduce((trace, file, i) => {
        return trace + (i + 1) + ') ' + file.name + '\n' + file.diff + '\n';
    }, '');

    return {
        trace: localization.CODE_STYLE_IS_NOT_GOOD + '\n\n' + trace,
        mark: 0,
    };
}

function parseTestResult(result) {
    let lastKey = '';
    return result.split('\n').map(s => s.trim()).filter(Boolean).reduce((result, str) => {
        if (!/^\[[\sx]\]\s/.test(str)) {
            lastKey = str;
            result[lastKey] = {};

            return result;
        }

        result[lastKey][str.replace(/^\[[\sx]\]\s/, '')] = str.includes('[x]');

        return result;
    }, {});
}

function getTestSchema(testResult) {
    const suits = Object.keys(testResult);

    return suits.map((testSuite) => {
        if (testResult[testSuite] && typeof testResult[testSuite] === 'object') {
            const trace = getTestSchema(testResult[testSuite]);

            return {
                group: testSuite,
                tests: trace,
            };
        }


        return {
            name: testSuite,
            passed: !!testResult[testSuite],
        };
    });
}

function convertSchemaToFeedback(schema, maxScore) {
    let trace = '';
    let points = 0;

    schema.forEach(groupItem => {
        let passedNested = 0;
        let nested = '';

        groupItem.tests.forEach((testItem, index) => {
            nested += '\t' + `${index + 1}) ` + testItem.name + ' ';
            nested += testItem.passed ? '✔️' : '⛔';
            nested += '\n';

            passedNested += testItem.passed ? 1 : 0;
        });

        const isGroupPassed = groupItem.tests.length === passedNested;

        if (isGroupPassed) {
            trace += '✔️ ' + groupItem.group + '\n';
        } else {
            trace += '⛔ ' + groupItem.group + `(${passedNested}/${groupItem.tests.length})\n${nested}\n`;
        }

        points += passedNested / groupItem.tests.length;
    });

    const mark = ((points / schema.length) * maxScore);

    return {
        trace,
        mark, 
    };
}

function generateResult(message, mark = 0) {
    const result = {
        buildNumber: BUILD,
        token: TOKEN,
        mark: mark,
        generatedFeedback: '',
        trace: message
    
    };

    console.log(result)

    fs.writeFileSync('result.json', JSON.stringify(result));
}
