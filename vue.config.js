const fs = require('fs')

module.exports = {
    devServer: {
        https: {
          cert: fs.readFileSync('./cert.pem'),
          key: fs.readFileSync('./key.pem')
        },
        port: 8443
    }
}