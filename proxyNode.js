const net = require('net')
const { exec } = require('child_process')
const { createReadStream, readFileSync } = require('fs')
const { TLSSocket } = require('tls')
const { writeFile } = require('fs').promises
let status = 0;
const regEx42git =
    /git@vogsphere-v2\.42tokyo\.jp:vogsphere\/intra-uuid-([0-9a-f]{8})-([0-9a-f]{4})-(4[0-9a-f]{3})-([0-9a-f]{4})-([0-9a-f]{12})-([0-9]{7})-[a-z]+/
const version = 0
const config = JSON.parse(readFileSync("./config.json"))
const socket = net.connect(config["port"], config["address"], () => {
    console.log('Connected to server.')

    const client = new TLSSocket(socket, { isServer: false })
    let rawData = ''

    console.log('Established TLS encrypted connection.')

    client.write(JSON.stringify({
        isNode: "true",
        version: version
    }));
    client.write('\a')
    client.on('data', chunk => {
        if (chunk.toString() === '\a' && status === 1) {
            console.log('Recieved request!')
            status = 2;
            (async () => {
                data = JSON.parse(rawData)
                rawData = ''
                if ( version < data.version ) upd()
                const repoUrl = data.repoUrl.match(regEx42git)[0]
                await writeFile(`${process.cwd()}/temp/sshKey`, data.sshKey)
                exec('chmod 400 temp/sshKey')
                console.log('Cloning repository...')
                let gitlog
                const gitProcess = exec(
                    `env GIT_SSH_COMMAND="ssh -i ${process.cwd()}/temp/sshKey" git clone ${repoUrl} ./temp/repo`,
                    (err, stdout, stderr) => {gitlog = `Error:\n${err}\nstdout:\n${stdout}\nstderr:\n${stderr}`}
                )
                await new Promise(r => { gitProcess.on('close', () => { r() }) })
                exec('rm temp/sshKey -f')
                client.write(gitlog)
                client.write("\a")
                console.log('Packing...')
                const tarProcess = exec(`tar -cf temp/repo.tar temp/repo/`)
                await new Promise(r => { tarProcess.on('close', () => { r() }) })

                console.log('Sending...')
                status = 3

                const rs = createReadStream('temp/repo.tar')
                rs.on('data', b => client.write(b))
                rs.on('close', () => {
                    exec('rm temp/repo -rf')
                    exec('rm temp/repo.tar')
                    client.write('\a')
                    console.log("Done! Thank you for your cooporation.")
                    status = 0
                })
            })()
        } else if ((status === 0) || (status === 1)) {
            status = 1
            rawData += chunk.toString()
        }
    })

    client.on('close', () => {
        console.log('Connection is closed')
    });
});
function upd() {
    socket.destroy()
    exec('npm run update')
}