const Alexa = require('ask-sdk-core');
const moment = require('moment');

const { audio, visual } = require('../../../res');
const {
    greet,
    supportsAPL,
    getRemoteData,
    switchVoice,
    addAplIfSupported,
    speakDate,
    getUrl,
    exists
} = require('../../../helper.js');

const INST_YESTERDAY = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'INST_YESTERDAY'
            || (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' &&
                handlerInput.requestEnvelope.request.arguments[0] === 'INST_YESTERDAY');
    },
    async handle(handlerInput) {
        const S3_EXISTS = await exists('Media/NewsOpener.mp3');
        const audioUri = S3_EXISTS ? await getUrl("Media/NewsOpener.mp3").replace(/&/g, '&amp;') : '';
        let introTheme = S3_EXISTS ? `<audio src='${audioUri}' />` : '';

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        const REPORT_PROMPT = attributes.t('REPORT_INST');

        await getRemoteData(`${process.env.EXTERNAL_URL}`)
            .then((response) => {
                const res = JSON.parse(response);
                const data = res.inst;
                let title1 = data.yesterday1.titleText;
                let speakText1 = data.yesterday1.speakText;
                let displayText1 = data.yesterday1.displayText;
                let title2 = data.yesterday2.titleText;
                let speakText2 = data.yesterday2.speakText;
                let displayText2 = data.yesterday2.displayText;

                let lastUpdated = moment(res.last_updated + "+06:00", "YYYY-MM-DD HH:mm:ssZ");
                let mobileDisplay = data.yesterday1.mDisplayText;

                if (!supportsAPL(handlerInput)) {
                    handlerInput.responseBuilder
                        .addDirective({
                            type: 'Alexa.Presentation.APLA.RenderDocument',
                            document: audio.mobile_report,
                            datasources: {
                                data: {
                                    type: 'object',
                                    properties: {
                                        "bodyText": ` ${greet} ${speakText1} ${speakText2}. To hear another report ${REPORT_PROMPT}`,
                                    },
                                },
                            },
                        });

                    return handlerInput.responseBuilder
                        .withSimpleCard(`${title1}`, `${mobileDisplay}`)
                        .reprompt(REPORT_PROMPT)
                        .getResponse();
                }

                const datasources = {
                    "card": {
                        "type": "object",
                        "properties": {
                            "pagerData": [
                                {
                                    "text": displayText1,
                                    "id": "one",
                                    "pageText": switchVoice(speakText1, "Matthew"),
                                    "HeaderText": title1
                                },
                                {
                                    "text": displayText2,
                                    "id": "two",
                                    "pageText": switchVoice(speakText2, "Matthew"),
                                    "HeaderText": title2
                                },
                                {
                                    "text": "Thanks for watching. <br>To see another report you can say, <br><i>'Alexa, Open report two'</i> or <br><i>'Alexa, Open report three'</i>",
                                    "id": "three",
                                    "pageText": switchVoice(`To see another report<break time='0.3s'/> ${REPORT_PROMPT}`, "Matthew"),
                                    "HeaderText": "Thank you"
                                }
                            ],
                            "uploadTime": `${lastUpdated.fromNow()}`,
                            "preambleSsml": `<speak>Greetings to AHD report. Today is ${speakDate} </speak>`,
                            "reportTitle": "INST Yesterday Sales Analysis",
                            "reportSubtitle": "Animal Health Division"
                        },
                        "transformers": [
                            {
                                "inputPath": "pagerData[*].pageText",
                                "outputName": "textSpeech",
                                "transformer": "ssmlToSpeech"
                            },
                            {
                                "inputPath": "preambleSsml",
                                "outputName": "preambleSpeech",
                                "transformer": "ssmlToSpeech"
                            }
                        ]
                    }
                };

                console.log(JSON.stringify(datasources));

                // Add visuals if supported
                addAplIfSupported(handlerInput, visual.report, datasources);

            })

        return handlerInput.responseBuilder
            .speak(introTheme)
            .getResponse();
    }
};

module.exports = INST_YESTERDAY;