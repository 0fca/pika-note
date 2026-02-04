const fs = require('fs')

module.exports = {
    devServer: {
        https: process.env.NODE_ENV === 'development' && fs.existsSync('./cert.pem') && fs.existsSync('./key.pem') 
            ? {
                cert: fs.readFileSync('./cert.pem'),
                key: fs.readFileSync('./key.pem')
            }
            : false,
        port: 8443
    }
}