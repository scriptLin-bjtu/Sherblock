import { callBigModelVision } from "./agent.js";
import "dotenv/config";
(async () => {
    //console.log(process.env.BIGMODEL_API_KEY);
    const result = await callBigModelVision({
        apiKey: process.env.BIGMODEL_API_KEY,
        text: `hello,How are you today?`,
    });

    console.log(result);
})();

//Please check the Bitcoin price and crypto news today and give me some advice.

/*
{
  mode: 'plan',
  plan: [
    {
      step: 'Get the current Bitcoin price',
      result: null,
      skill: 'get_crypto_price'
    },
    {
      step: 'Get the latest crypto news',
      result: null,
      skill: 'get_crypto_news'
    },
    {
      step: 'Analyze the information and provide investment advice',
      result: null
    }
  ],
  current_step: 0
}
*/
