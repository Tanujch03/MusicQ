import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import youtubesearchapi from "youtube-search-api";  // Assuming you have addressed type declaration issue
import { prismaclient } from "../lib/db";

// Regex to match YouTube URLs and capture video ID
const YT_REGEX = /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

// Zod schema for request validation
const createStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const data = createStreamSchema.parse(await req.json());

    // Validate URL with regex
    const match = data.url.match(YT_REGEX);
    if (!match) {
      return NextResponse.json({
        message: "Invalid YouTube URL format",
      }, {
        status: 400,  // Use 400 for bad request
      });
    }

    // Extract video ID from the regex match
    const extractedId = match[1];

    // Fetch video details using the YouTube API
    const res = await youtubesearchapi.GetVideoDetails(extractedId);

    if (!res || !res.title) {
      return NextResponse.json({
        message: "Failed to fetch video details",
      }, {
        status: 500,
      });
    }

    // Sort thumbnails by width
    const thumbnails = res.thumbnail.thumbnails || [];
    thumbnails.sort((a: { width: number }, b: { width: number }) => a.width - b.width);

    // Create stream entry in the database
    const stream = await prismaclient.stream.create({
      data: {
        userId: data.creatorId,
        url: data.url,
        extractedId,
        type: "Youtube",
        title: res.title ?? "Video title not found",
        smallImg: (thumbnails.length > 1 ? thumbnails[thumbnails.length - 2].url : thumbnails[thumbnails.length - 1]?.url) || "",
        bigImg: thumbnails[thumbnails.length - 1]?.url || "",
      },
    });

    return NextResponse.json({
      message: "Stream added successfully",
      id: stream.id,
    });
  } catch (e) {
    console.error("Error adding stream:", e);
    return NextResponse.json({
      message: "Error while adding stream",
    }, {
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const creatorId = req.nextUrl.searchParams.get("creatorId");

    const streams = await prismaclient.stream.findMany({
      where: {
        userId: creatorId || "",
      },
    });

    return NextResponse.json({ streams });
  } catch (e) {
    console.error("Error fetching streams:", e);
    return NextResponse.json({
      message: "Error fetching streams",
    }, {
      status: 500,
    });
  }
}
