// ═══════════════════════════════════════════════════════════════
// Lily — Knowledge & Web Search Tools (FREE, no API keys)
// Uses Wikipedia + DuckDuckGo for answers
// ═══════════════════════════════════════════════════════════════

/**
 * Get a summary from Wikipedia
 */
async function wikipediaSummary(topic) {
  try {
    // First try Wikipedia search (more reliable than direct lookup)
    const searchResp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=1&format=json&srlimit=5`,
      { signal: AbortSignal.timeout(8000) }
    );
    const searchData = await searchResp.json();
    const results = searchData?.query?.search || [];

    if (results.length === 0) {
      return await duckduckgoAnswer(topic);
    }

    // Pick the best result — prefer exact title matches
    let bestTitle = results[0].title;
    for (const r of results) {
      if (r.title.toLowerCase() === topic.toLowerCase()) {
        bestTitle = r.title;
        break;
      }
    }

    // Fetch summary of the best result
    const summaryResp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!summaryResp.ok) {
      return await duckduckgoAnswer(topic);
    }

    const data = await summaryResp.json();

    // If we got a disambiguation, try with more specific search
    if (data.type === 'disambiguation') {
      // Try adding context keywords
      const contextSearch = `${topic} (overview)`;
      return await wikipediaSearch(contextSearch);
    }

    const title = data.title || topic;
    const extract = data.extract || 'No summary available.';
    const url = data.content_urls?.desktop?.page || '';

    let result = `📖 **${title}**\n\n${extract}`;
    if (url) result += `\n\n🔗 [Read more](${url})`;

    return { message: result };
  } catch (err) {
    return await duckduckgoAnswer(topic);
  }
}

/**
 * Search Wikipedia when direct lookup fails
 */
async function wikipediaSearch(query) {
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=3`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await resp.json();
    const results = data?.query?.search || [];

    if (results.length === 0) {
      return await duckduckgoAnswer(query);
    }

    // Get summary of the first result
    const topTitle = results[0].title;
    const summaryResp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const summaryData = await summaryResp.json();

    let result = `📖 **${summaryData.title || topTitle}**\n\n${summaryData.extract || 'No summary available.'}`;
    if (summaryData.content_urls?.desktop?.page) {
      result += `\n\n🔗 [Read more](${summaryData.content_urls.desktop.page})`;
    }

    return { message: result };
  } catch (err) {
    return await duckduckgoAnswer(query);
  }
}

/**
 * Get instant answer from DuckDuckGo (free, no API key)
 */
async function duckduckgoAnswer(query) {
  try {
    const resp = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await resp.json();

    // Try Abstract first (Wikipedia-sourced)
    if (data.Abstract) {
      let result = `📖 **${data.Heading || query}**\n\n${data.Abstract}`;
      if (data.AbstractURL) result += `\n\n🔗 [Source](${data.AbstractURL})`;
      return { message: result };
    }

    // Try Answer (computed answers)
    if (data.Answer) {
      return { message: `💡 ${data.Answer}` };
    }

    // Try Related Topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter(t => t.Text)
        .slice(0, 3)
        .map(t => `• ${t.Text}`)
        .join('\n');
      
      if (topics) {
        return { message: `🔍 **${query}**\n\n${topics}` };
      }
    }

    // Nothing found — suggest Google
    return {
      message: `I couldn't find a quick answer for "${query}". Would you like me to Google it?`,
      noResult: true,
    };
  } catch (err) {
    return {
      message: `I'm having trouble searching right now (${err.message}). Are you connected to the internet?`,
      error: true,
    };
  }
}

/**
 * Answer any knowledge question (tries Wikipedia → DuckDuckGo → Google)
 */
async function answerQuestion(query) {
  // First try Wikipedia
  const result = await wikipediaSummary(query);

  // If no result, offer to Google
  if (result.noResult) {
    return result;
  }

  return result;
}

module.exports = { answerQuestion, wikipediaSummary, duckduckgoAnswer };
