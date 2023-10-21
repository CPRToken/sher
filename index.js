require('dotenv').config();
const { twitterClient } = require("./twitterClient.js");
const OpenAI = require('openai');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');


const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // Get API key from .env
const openai = new OpenAI({ key: process.env.OPENAI_API_KEY });



const categories = ['Technology', 'Business' ]; // Add as many as you like

const fetchNewsArticle = async () => {
    try {
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const NEWS_API_URL = `https://newsapi.org/v2/top-headlines?country=us&category=${randomCategory}&apiKey=${process.env.NEWS_API}`;
        const response = await fetch(NEWS_API_URL);

        if (!response.ok) {
            console.error(`API Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.articles[0].title; // Gets title of first article, replace with actual attribute
    } catch (error) {
        console.error('Error fetching news article:', error);
        return null;
    }
};




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


function extractKeywords(rewrittenArticle) {
    // Split article into array of words
    const words = rewrittenArticle.split(/\s+/);

    // Remove duplicates
    const uniqueWords = [...new Set(words)];

    // Choose up to first 5 unique words as keywords
    const keywords = uniqueWords.slice(0, 5).join(", ");

    return keywords;
}





async function getRewrittenArticle(originalArticle) {
    try {
        const prompt = `Rewrite the following news article, with a AI and Finance spin: ${originalArticle}`;

        const response = await openai.completions.create({
            model: "gpt-3.5-turbo-instruct",
            prompt: prompt,
            max_tokens: 300,  // Adjust based on how long you want the rewritten article to be
            temperature: 0.7
        });

        return response.choices[0].text.trim();
    } catch (error) {
        console.log("Error rewriting article:", error);
    }



}




const appendHashTagsAndMentions = (tweetContent) => {
    return `${tweetContent}  @AINewsEvents!`
};

const trimToCompleteSentence = (tweet) => {
    if (tweet.length <= 280) return tweet;

    let lastValidEnd = tweet.lastIndexOf('.', 279);
    if (lastValidEnd === -1) lastValidEnd = tweet.lastIndexOf('!', 279);
    if (lastValidEnd === -1) lastValidEnd = tweet.lastIndexOf('?', 279);

    return lastValidEnd !== -1 ? tweet.substring(0, lastValidEnd + 1) : tweet.substring(0, 277) + "...";
};




//initiate actual tweet function
const tweet = async () => {
    try {
        const originalArticle = await fetchNewsArticle(); // Replace this with actual fetched article
        const rewrittenArticle = await getRewrittenArticle(originalArticle);

        if (rewrittenArticle) {
            const fullTweet = appendHashTagsAndMentions(rewrittenArticle);  // Assuming your existing function can handle article text
            const trimmedTweet = trimToCompleteSentence(fullTweet);


            const keywords = extractKeywords(rewrittenArticle);

            // 1. Fetch the image URL for "AI" topic
            const mediaData = await fetchMedia(keywords);
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

// Schedule the tweet function to run every 10 minutes
cron.schedule('*/1 * * * *', tweet);



console.log("Started scheduler to tweet every 1 minutes.");

