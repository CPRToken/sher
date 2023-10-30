require('dotenv').config();
const { twitterClient } = require("./twitterClient.js");
const OpenAI = require('openai');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');


const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // Get API key from .env
const openai = new OpenAI({ key: process.env.OPENAI_API_KEY });




async function downloadImage(url, path) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(path, buffer);
}


async function downloadVideo(url, path) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(path, buffer);
}


async function fetchMedia(query) {
    let PEXELS_API_URL;
    let responseType;

    const isFetchingVideo = Math.random() >= 0.5; // Randomly decide between fetching an image or a video

    if (isFetchingVideo) {
        PEXELS_API_URL = 'https://api.pexels.com/v1/videos/search';
        responseType = 'videos';
    } else {
        PEXELS_API_URL = 'https://api.pexels.com/v1/search';
        responseType = 'photos';
    }

    const ITEMS_TO_FETCH = 5;
    const response = await fetch(`${PEXELS_API_URL}?query=${query}&per_page=${ITEMS_TO_FETCH}`, {
        headers: {
            'Authorization': PEXELS_API_KEY
        }
    });

    const data = await response.json();

    if (responseType === 'videos' && data.videos && data.videos.length > 0) {
        const randomVideo = data.videos[Math.floor(Math.random() * data.videos.length)];
        const videoURL = randomVideo.video_files[0].link;

        return {
            type: 'video',
            url: videoURL.startsWith("//") ? `https:${videoURL}` : videoURL
        };

    } else if (data.photos && data.photos.length > 0) {
        const randomImage = data.photos[Math.floor(Math.random() * data.photos.length)];
        return {
            type: 'image',
            url: randomImage.src.large
        };
    } else {
        throw new Error('Failed to fetch media from Pexels.');
    }
}



const prompts = [

    "How can AI be leveraged to improve customer service in small businesses?",
    "Explore innovative ways AI can be integrated into daily life to enhance convenience.",
    "What are the ethical considerations when using AI for decision-making in business?",
    "Discuss the impact of AI on job markets and the need for reskilling in the workforce.",
    "How can startups use AI to gain a competitive edge in their industries?",
    "Explore the role of AI in optimizing supply chain management for larger corporations.",
    "What steps can businesses take to ensure the responsible and transparent use of AI?",
    "Investigate the potential of AI in healthcare for early disease detection and personalized treatment.",
    "How can AI-driven chatbots enhance e-commerce and customer support experiences?",
    "Discuss the challenges and benefits of implementing AI-driven automation in manufacturing.",
    "Explore AI-powered marketing strategies for small businesses with limited budgets.",
    "How can AI be used to analyze big data and drive data-driven decisions in organizations?",
    "Investigate the role of AI in predicting and preventing cyberattacks in the business sector.",
    "Discuss the ethical implications of AI-generated content in media and advertising.",
    "Explore the future of autonomous vehicles and their impact on transportation and logistics.",
    "How can AI-driven virtual assistants improve productivity and time management in business?",
    "Discuss the potential for AI to revolutionize the field of agriculture and increase crop yields.",
    "Investigate the use of AI in financial services for fraud detection and risk assessment.",
    "How can AI-powered language translation tools bridge communication gaps in global businesses?",
    "Explore the challenges and opportunities of integrating AI into education and online learning.",
    "Discuss the role of AI in personalizing content recommendations on streaming platforms.",
    "How can AI-driven predictive analytics benefit small businesses in making strategic decisions?",
    "Investigate the impact of AI on the entertainment industry, from content creation to distribution.",
    "Explore AI-powered tools for enhancing mental health and well-being in the workplace.",
    "Discuss the potential for AI to assist in environmental conservation and sustainability efforts.",
    "How can AI be used to optimize energy consumption in smart homes and buildings?",
    "Investigate the challenges of bias and fairness in AI algorithms and their implications.",
    "How can AI and blockchain technologies be leveraged to improve customer service in small businesses?",
    "Explore innovative ways AI and blockchain can be integrated into daily life to enhance convenience.",
    "What are the ethical considerations when using AI and blockchain for decision-making in business?",




];
async function getGeneratedTweet() {
    try {
        // Randomly pick a prompt from the prompts array
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

        const response = await openai.completions.create({
            model: "gpt-3.5-turbo-instruct",
            prompt: randomPrompt,
            max_tokens: 300,
            temperature: 0.7
        });

        return response.choices[0].text.trim();
    } catch (error) {
        console.log("Error generating tweet:", error);
    }
}
const appendHashTagsAndMentions = (tweetContent) => {
    return `${tweetContent} #AI #blockchain #technology`;
};




const trimToCompleteSentence = (tweet) => {
    if (tweet.length <= 280) return tweet;

    let lastValidEnd = tweet.lastIndexOf('.', 279);
    if (lastValidEnd === -1) lastValidEnd = tweet.lastIndexOf('!', 279);
    if (lastValidEnd === -1) lastValidEnd = tweet.lastIndexOf('?', 279);

    return lastValidEnd !== -1 ? tweet.substring(0, lastValidEnd + 1) : tweet.substring(0, 277) + "...";
};

const tweet = async () => {
    try {
        const tweetContent = await getGeneratedTweet();
        if (tweetContent) {
            const fullTweet = appendHashTagsAndMentions(tweetContent);
            const trimmedTweet = trimToCompleteSentence(fullTweet);

            // 1. Fetch the image URL for "AI" topic
            const mediaData = await fetchMedia( "technology", "crypto", "blockchain", "business", "innovation", "artificial intelligence", "robotics", "make money",);
            const filename = `ai_media_${Date.now()}`;

            let mediaId;

            if (mediaData.type === "image") {
                const localImagePath = `./media/${filename}.jpg`;
                await downloadImage(mediaData.url, localImagePath);
                mediaId = await twitterClient.v1.uploadMedia(localImagePath);
            } else {
                const localVideoPath = `./media/${filename}.mp4`;
                await downloadVideo(mediaData.url, localVideoPath);
                mediaId = await twitterClient.v1.uploadMedia(localVideoPath);
            }
            await twitterClient.v2.tweet({
                text: trimmedTweet,
                media: {
                    media_ids: [mediaId]
                }
            });
        } else {
            console.log("Failed to generate a tweet.");
        }
    } catch (e) {
        console.error("Error posting tweet:", e);
    }
};



cron.schedule('0 * * * *', tweet);




console.log("Started scheduler to tweet once every hour");
