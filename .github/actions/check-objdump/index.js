const fetch = require("node-fetch");
const core = require('@actions/core');
const fs = require("fs");
const { exec } = require('child_process');

const url = (version) => `https://engfilestorage.blob.core.windows.net/${version}/librust_cosmwasm_enclave.signed.so`;
const filename = "librust_cosmwasm_enclave.signed.so";
const objdumpCommand = `objdump -d ${filename} | grep -w 'lfence' | wc -l`;

try {
    const version = core.getInput('version');
    const lfenceMinimum = core.getInput('min-fence');

    const splitVersion = version.split('.')
    const parsedVersion = `${splitVersion[0]}.${splitVersion[1]}`

    const body = await fetch(url(parsedVersion))
        .then((x) => x.buffer())
        .catch((err) => {
            core.setFailed(`Fail to download file ${url(version)}: ${err}`);
            return undefined;
        });

    if (body === undefined) {
        throw new Error("failed to download file - no body");
    }

    console.log("Download completed.");

    fs.writeFileSync(filename, body);
    console.log("File saved.");
    core.setOutput("filename", filename);

    exec(objdumpCommand, (err, stdout, _) => {
        if (err) {
            throw new Error(`Error executing command: ${err}`);
        }

        core.setOutput("lfence", stdout);

        if (Number(stdout) < Number(lfenceMinimum)) {
            throw new Error(`LFENCE instructions found is less than minimum: ${stdout} vs minimum expected: ${lfenceMinimum}`);
        }
    });
} catch (error) {
    core.setFailed(error.message);
}