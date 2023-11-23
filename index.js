require('dotenv').config();
const { twitterClient } = require("./twitterClient.js");
const OpenAI = require('openai');
const cron = require('node-cron');
const fetch = require('node-fetch');
const fs = require('fs');


const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // Get API key from .env





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



const hardcodedTweets = [

    "As AI and blockchain intertwine, they're creating groundbreaking crypto projects. What's your vision for this tech synergy in the next decade? Do you think it will redefine digital transactions? Share your thoughts. #TechFusion #DigitalFuture",
    "AI's resilience in tech is notable, especially in the face of challenges. How do you see AI shaping our technological landscape in the years to come? What roles will AI play in future innovations? Discuss your predictions. #AIAdvancements #FutureTech",
    "The impact of AI on material science and innovation is revolutionizing research and development. How do you believe this will reshape our approach to scientific breakthroughs and practical applications? Let's explore the possibilities. #AIInResearch #InnovationJourney",
    "With AI reshaping cloud computing, we're witnessing a new era in technology. What transformative effects do you expect in the broader tech industry? How do you think this will change the way we interact with digital environments? #CloudEvolution #AITransformation",
    "The integration of AI in game design is changing the gaming landscape. What are your thoughts on AI's role in future game development and player experiences? How will this technology alter the creative process in gaming? #GamingRevolution #AICreativePower",
    "AI's growing influence in video content creation is opening new creative avenues. How do you see this impacting the media production landscape in the coming years? Will AI become an indispensable tool for creators? Share your insights. #MediaEvolution #AIinMedia",
    "The merger of blockchain technology and AI is crafting unique solutions and opportunities. What impact do you think this fusion will have on our daily tech interactions and the future of digital infrastructure? Let's discuss the future. #TechFusion #BlockchainAI",
    "As the debate on AI ethics and regulation gains momentum, what ethical guidelines and regulations do you believe are crucial for a responsible AI future? How should we balance innovation with ethical considerations? #EthicalAI #AIRegulation",
    "AI's potential in automating tedious tasks is reshaping job dynamics across industries. How do you foresee this affecting employment and skill requirements in the future? What new opportunities do you think AI will create? #AIatWork #FutureOfWork",
    "Blockchain technology's intersection with AI is opening new frontiers. What innovative applications and developments do you foresee emerging from this synergy? How will this combination transform existing industries? #BlockchainTech #AIIntegration",
    "AI's crucial role in evolving cloud computing is setting new standards. How do you see this influencing the future of cloud services and data management? What advancements do you anticipate in cloud technology due to AI integration? #CloudAI #TechEvolution",
    "The fusion of AI and blockchain is unlocking groundbreaking potential. What innovative applications and developments do you expect from this combination? How do you think this fusion will revolutionize various sectors? #InnovativeTech #AIBlockchain",
    "AI is transforming content creation processes across mediums. What are your thoughts on AI's role in enhancing and streamlining the creative process? How do you think AI will influence content creators and the industry? #CreativeAI #ContentEvolution",
    "As AI continues to evolve, its potential in enhancing cybersecurity is gaining attention. How do you foresee AI transforming our approach to digital security and privacy? What advancements and challenges do you predict in this vital field? #AISecurity #DigitalProtection",
    "AI is revolutionizing the field of education. How do you envision AI shaping the future of learning and teaching? What impacts do you see on personalized education and global learning opportunities? #AIEducation #FutureOfLearning",
    "The integration of AI in financial services is creating new opportunities. How do you think AI will change the landscape of banking and investment? What innovations do you anticipate in fintech driven by AI advancements? #AIFinance #FintechEvolution",




];



function getHourlyTweet() {
    const currentHour = new Date().getHours();
    const tweetIndex = currentHour % hardcodedTweets.length;
    return hardcodedTweets[tweetIndex];
}






const tweet = async () => {
    try {
        const tweetContent = getHourlyTweet();
        if (tweetContent) {

            // 1. Fetch the image URL for "AI" topic
            const mediaData = await fetchMedia( "technology", "crypto", "blockchain", "business", "innovation", "artificial intelligence", "robotics", "make money" , "future", "tech", "ai", "machine learning", "data science", "data", "big data", "cloud computing", "cloud", "cybersecurity", "cyber security", "security", "privacy", "education", "learning", "teaching", "fintech", "finance", "banking", "investment", "money", "economy", "economics", "digital", "digital transformation", "digital future", "digitalization", "digitalisation", "digital transformation", "digitalization", "digitalisation",);
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
                text: tweetContent,
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
