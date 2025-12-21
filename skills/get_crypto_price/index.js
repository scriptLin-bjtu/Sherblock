// skills/get_crypto_price/index.js
let input = "";

process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
    const params = JSON.parse(input);
    let result;
    if (params.name === "BTC") {
        result = {
            name: params.name,
            price: 89272,
        };
    }
    if (params.name === "ETH") {
        result = {
            name: params.name,
            price: 3210,
        };
    }

    console.log(JSON.stringify(result));
});
