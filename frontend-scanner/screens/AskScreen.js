import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { askAssistant } from '../api';
import { c } from '../theme';

// Questions about the register, answered by the backend.
//
// UNLIKE EVERY OTHER SCREEN, THIS ONE NEEDS A SIGNAL. The rest of the scanner
// queues work and syncs later, because a verification recorded offline is still
// a fact. A question is not — there is nothing to queue, and pretending
// otherwise would leave an officer waiting for an answer that never arrives.
// So this says plainly when it cannot help.

const SUGGESTIONS = [
  'What assets are at this branch?',
  'How many days annual leave do I get?',
  'What do I do with company assets when I leave?',
];

export default function AskScreen({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, []);

  const send = async (text) => {
    const q = (text ?? question).trim();
    if (!q || busy) return;

    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setBusy(true);

    try {
      const res = await askAssistant(q);
      setMessages((m) => [...m, { role: 'bot', text: res.answer }]);
    } catch (err) {
      // Distinguish "no signal" from "the server said no", because the two
      // need different things from the user.
      const offline = !err.response;
      setMessages((m) => [...m, {
        role: 'bot',
        error: true,
        text: offline
          ? 'I need a connection to answer that. Your scans and verifications still work offline — only questions need a signal.'
          : err.response?.data?.error || 'I could not answer that. Please try again.',
      }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backButton} activeOpacity={0.6}>
          <Text style={s.backChevron}>‹</Text>
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ask</Text>
      </View>

      {!online && (
        <View style={s.offlineBar}>
          <Text style={s.offlineText}>
            No connection. Questions need a signal — scanning and verifying do not.
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={s.body}
        contentContainerStyle={s.bodyInner}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View>
            <Text style={s.emptyTitle}>Ask about the register</Text>
            <Text style={s.emptyText}>
              Assets, who holds what, and HR or ICT policy. Answers cover whatever your
              own role and branch allow.
            </Text>
            {SUGGESTIONS.map((sug) => (
              <TouchableOpacity key={sug} style={s.chip} onPress={() => send(sug)}>
                <Text style={s.chipText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              s.msg,
              m.role === 'user' ? s.msgUser : s.msgBot,
              m.error && s.msgError,
            ]}
          >
            <Text style={[
              s.msgText,
              m.role === 'user' && s.msgTextUser,
              m.error && s.msgTextError,
            ]}>
              {m.text}
            </Text>
          </View>
        ))}

        {busy && (
          <View style={[s.msg, s.msgBot]}>
            <ActivityIndicator size="small" color={c.inkFaint} />
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question…"
          placeholderTextColor={c.inkFaint}
          maxLength={500}
          editable={!busy}
          returnKeyType="send"
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity
          style={[s.sendButton, (busy || !question.trim()) && s.sendDisabled]}
          onPress={() => send()}
          disabled={busy || !question.trim()}
        >
          <Text style={s.sendText}>Ask</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: c.paper, borderBottomWidth: 1, borderBottomColor: c.rule,
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 6, paddingRight: 14, paddingVertical: 10,
  },
  backChevron: { fontSize: 30, lineHeight: 32, color: c.navy, fontWeight: '300', marginRight: 2 },
  backLabel: { fontSize: 16, color: c.navy, fontWeight: '600' },
  headerTitle: { fontSize: 13, fontWeight: '600', color: c.inkSoft, letterSpacing: 0.4 },

  offlineBar: { backgroundColor: '#FDF3E3', paddingHorizontal: 16, paddingVertical: 10 },
  offlineText: { fontSize: 12.5, color: '#B26A00', lineHeight: 18 },

  body: { flex: 1 },
  bodyInner: { padding: 16, gap: 10 },

  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.ink, marginBottom: 6 },
  emptyText: { fontSize: 13.5, color: c.inkSoft, lineHeight: 20, marginBottom: 16 },

  chip: {
    backgroundColor: c.paper, borderRadius: 10, borderWidth: 1, borderColor: c.rule,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  chipText: { fontSize: 14, color: c.ink },

  msg: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, maxWidth: '88%' },
  msgUser: { backgroundColor: c.navy, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgBot: { backgroundColor: c.paper, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgError: { backgroundColor: '#FDECEA' },
  msgText: { fontSize: 14.5, color: c.ink, lineHeight: 21 },
  msgTextUser: { color: c.paper },
  msgTextError: { color: '#C0392B' },

  inputRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16,
    backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.rule,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: c.rule, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: c.ink, backgroundColor: c.paper,
  },
  sendButton: {
    backgroundColor: c.orange, borderRadius: 10,
    paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: c.paper, fontSize: 15, fontWeight: '700' },
});