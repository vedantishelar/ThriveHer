import React from 'react';
import { View, Text, StyleSheet, Linking, Alert } from 'react-native';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: string;
}

const MessageBubble = ({
  message,
  isUser,
  timestamp
}: MessageBubbleProps) => {
  
  // Handle link press
  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    const elements: JSX.Element[] = [];
    const lines = text.split('\n');
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle headers
      if (line.startsWith('# ')) {
        elements.push(
          <Text key={key++} style={styles.h1}>
            {line.substring(2)}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <Text key={key++} style={styles.h2}>
            {line.substring(3)}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <Text key={key++} style={styles.h3}>
            {line.substring(4)}
          </Text>
        );
      }
      // Handle code blocks
      else if (line.startsWith('```')) {
        const codeLines = [];
        i++; // Skip the opening ```
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <View key={key++} style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {codeLines.join('\n')}
            </Text>
          </View>
        );
      }
      // Handle blockquotes
      else if (line.startsWith('> ')) {
        elements.push(
          <View key={key++} style={styles.blockquote}>
            <Text style={styles.blockquoteText}>
              {line.substring(2)}
            </Text>
          </View>
        );
      }
      // Handle bullet points
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <View key={key++} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>
              {parseInlineMarkdown(line.substring(2))}
            </Text>
          </View>
        );
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          elements.push(
            <View key={key++} style={styles.listItem}>
              <Text style={styles.bulletPoint}>{match[1]}.</Text>
              <Text style={styles.listText}>
                {parseInlineMarkdown(match[2])}
              </Text>
            </View>
          );
        }
      }
      // Handle regular paragraphs
      else if (line.trim()) {
        elements.push(
          <Text key={key++} style={styles.paragraph}>
            {parseInlineMarkdown(line)}
          </Text>
        );
      }
      // Handle empty lines
      else {
        elements.push(<View key={key++} style={styles.emptyLine} />);
      }
    }

    return elements;
  };

  // Parse inline markdown with proper link handling (both markdown links and plain URLs)
  const parseInlineMarkdown = (text: string): JSX.Element => {
    // Check for both markdown links and plain URLs
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    
    const hasMarkdownLinks = markdownLinkRegex.test(text);
    const hasPlainUrls = urlRegex.test(text);
    
    if (!hasMarkdownLinks && !hasPlainUrls) {
      // No links, parse other markdown normally
      return parseTextWithFormatting(text);
    }

    // Find all links (both types)
    const allLinks: Array<{
      start: number;
      end: number;
      text: string;
      url: string;
      type: 'markdown' | 'plain';
    }> = [];

    // Reset regex
    markdownLinkRegex.lastIndex = 0;
    urlRegex.lastIndex = 0;

    // Find markdown links
    let match;
    while ((match = markdownLinkRegex.exec(text)) !== null) {
      allLinks.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        url: match[2],
        type: 'markdown'
      });
    }

    // Find plain URLs
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      // Check if this URL is already part of a markdown link
      const isPartOfMarkdownLink = allLinks.some(link => 
        link.type === 'markdown' && 
        match.index >= link.start && 
        match.index < link.end
      );
      
      if (!isPartOfMarkdownLink) {
        allLinks.push({
          start: match.index,
          end: match.index + match[0].length,
          text: url,
          url: url,
          type: 'plain'
        });
      }
    }

    // Sort links by start position
    allLinks.sort((a, b) => a.start - b.start);

    // Parse text with links
    const elements: JSX.Element[] = [];
    let lastIndex = 0;
    let key = 0;
    
    allLinks.forEach(link => {
      // Add text before link
      if (link.start > lastIndex) {
        const beforeText = text.substring(lastIndex, link.start);
        if (beforeText) {
          elements.push(
            <Text key={key++}>
              {parseTextWithFormatting(beforeText)}
            </Text>
          );
        }
      }
      
      // Add clickable link
      elements.push(
        <Text
          key={key++}
          style={styles.link}
          onPress={() => handleLinkPress(link.url)}
        >
          {link.text}
        </Text>
      );
      
      lastIndex = link.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        elements.push(
          <Text key={key++}>
            {parseTextWithFormatting(remainingText)}
          </Text>
        );
      }
    }
    
    return <Text>{elements}</Text>;
  };

  // Parse text formatting (bold, italic, code) without links
  const parseTextWithFormatting = (text: string): JSX.Element => {
    const elements: JSX.Element[] = [];
    let currentIndex = 0;
    let key = 0;

    // Regex patterns for inline markdown (excluding links)
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, style: styles.bold },           // **bold**
      { regex: /\*(.*?)\*/g, style: styles.italic },             // *italic*
      { regex: /`(.*?)`/g, style: styles.inlineCode },           // `code`
    ];

    // Find all matches
    const allMatches: Array<{
      match: RegExpExecArray;
      pattern: typeof patterns[0];
      index: number;
    }> = [];

    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          match,
          pattern,
          index: match.index
        });
      }
    });

    // Sort matches by index
    allMatches.sort((a, b) => a.index - b.index);

    // Process matches
    allMatches.forEach(({ match, pattern }) => {
      // Add text before this match
      if (match.index > currentIndex) {
        const beforeText = text.substring(currentIndex, match.index);
        if (beforeText) {
          elements.push(
            <Text key={key++} style={styles.normalText}>
              {beforeText}
            </Text>
          );
        }
      }

      // Handle the match
      elements.push(
        <Text key={key++} style={[styles.normalText, pattern.style]}>
          {match[1]}
        </Text>
      );

      currentIndex = match.index + match[0].length;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        elements.push(
          <Text key={key++} style={styles.normalText}>
            {remainingText}
          </Text>
        );
      }
    }

    // If no matches found, return the original text
    if (elements.length === 0) {
      return (
        <Text style={styles.normalText}>
          {text}
        </Text>
      );
    }

    return <Text>{elements}</Text>;
  };

  // Check if message contains markdown syntax or URLs
  const hasMarkdown = /[*_`#\[\]!-]/.test(message) || 
                     message.includes('```') || 
                     message.includes('> ') ||
                     /^\d+\.\s/.test(message) ||
                     /https?:\/\//.test(message);

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.botContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.botBubble
      ]}>
        {!isUser && hasMarkdown ? (
          <View style={styles.markdownContainer}>
            {parseMarkdown(message)}
          </View>
        ) : (
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.botText
          ]}>
            {message}
          </Text>
        )}
      </View>
      <Text style={[
        styles.timestamp,
        isUser ? styles.userTimestamp : styles.botTimestamp
      ]}>
        {timestamp}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#8BA889',
    borderColor: '#8BA889',
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E7E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  botText: {
    color: '#253528',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#49654E',
  },
  botTimestamp: {
    color: '#49654E',
    opacity: 0.7,
  },
  // Markdown styles
  markdownContainer: {
    flexDirection: 'column',
  },
  normalText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#253528',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
    color: '#253528',
    marginBottom: 8,
  },
  h1: {
    fontSize: 20,
    fontWeight: '700',
    color: '#253528',
    marginBottom: 8,
    marginTop: 4,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#253528',
    marginBottom: 6,
    marginTop: 4,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#253528',
    marginBottom: 4,
    marginTop: 4,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    backgroundColor: '#F0F4F0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  codeBlock: {
    backgroundColor: '#F0F4F0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  codeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#253528',
    lineHeight: 18,
  },
  blockquote: {
    backgroundColor: '#F0F4F0',
    borderLeftWidth: 4,
    borderLeftColor: '#8BA889',
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  blockquoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#253528',
    lineHeight: 22,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    color: '#253528',
    marginRight: 8,
    lineHeight: 22,
    fontWeight: '600',
  },
  listText: {
    fontSize: 16,
    color: '#253528',
    lineHeight: 22,
    flex: 1,
  },
  link: {
    color: '#8BA889',
    textDecorationLine: 'underline',
    fontSize: 16,
    lineHeight: 22,
  },
  emptyLine: {
    height: 8,
  },
});

export default MessageBubble;