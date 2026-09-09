import { useEffect, useMemo, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FlowHeader } from "../components/FlowHeader";
import { featuredDestinations } from "../data/destinations";
import { getPlaceDestination, searchPlaces, type PlaceSuggestion } from "../services/placesService";
import { useAppStore } from "../store/useAppStore";
import type { Destination } from "../types/destination";
import { font } from "../theme/typography";

type SearchResult =
  | { kind: "place"; id: string; suggestion: PlaceSuggestion }
  | { kind: "featured"; id: string; destination: Destination };

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const sessionToken = useRef(randomUUID());
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeOverlay = useAppStore((state) => state.closeOverlay);
  const completeDestinationSearch = useAppStore((state) => state.completeDestinationSearch);

  const featuredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return featuredDestinations;
    return featuredDestinations.filter((destination) =>
      `${destination.name} ${destination.region}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setSuggestions([]);
      setSearching(false);
      setError(null);
      return;
    }
    let active = true;
    setSearching(true);
    const timeout = setTimeout(() => {
      void searchPlaces(normalized, sessionToken.current)
        .then((results) => {
          if (!active) return;
          setSuggestions(results);
          setError(null);
        })
        .catch((requestError) => {
          if (!active) return;
          setSuggestions([]);
          setError(requestError instanceof Error ? requestError.message : "Destination search is unavailable.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 280);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return featuredMatches.map((destination) => ({ kind: "featured", id: `featured:${destination.id}`, destination }));
    const remote = suggestions.map((suggestion) => ({ kind: "place" as const, id: `place:${suggestion.placeId}`, suggestion }));
    const remoteNames = new Set(suggestions.map((suggestion) => suggestion.mainText.toLowerCase()));
    const featured = featuredMatches
      .filter((destination) => !remoteNames.has(destination.name.toLowerCase()))
      .map((destination) => ({ kind: "featured" as const, id: `featured:${destination.id}`, destination }));
    return [...remote, ...featured];
  }, [featuredMatches, query, suggestions]);

  const chooseResult = async (result: SearchResult) => {
    if (selectingId) return;
    if (result.kind === "featured") {
      completeDestinationSearch(result.destination);
      return;
    }
    setSelectingId(result.id);
    setError(null);
    try {
      completeDestinationSearch(await getPlaceDestination(result.suggestion.placeId, sessionToken.current));
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : "That destination could not be opened.");
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <FlowHeader eyebrow="DESTINATION" title="Choose a place" onBack={closeOverlay} />
      <FlatList
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 32 + (Platform.OS === "android" ? insets.bottom : 0) }]}
        data={results}
        keyExtractor={(result) => result.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <>
            <Text style={styles.intro}>Search cities and destinations across India, or choose a featured place.</Text>
            <View style={styles.searchField}>
              <Text style={styles.searchGlyph}>⌕</Text>
              <TextInput accessibilityLabel="Search destinations in India" autoCapitalize="words" autoCorrect={false} onChangeText={setQuery} placeholder="Search Shimla, Gangtok, Hampi…" placeholderTextColor="#839087" returnKeyType="search" style={styles.input} value={query} />
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.labelRow}>
              <Text style={styles.label}>{query.trim() ? "INDIA SEARCH RESULTS" : "FEATURED INDIA DESTINATIONS"}</Text>
              <Text style={styles.resultCount}>{searching ? "Searching…" : `${results.length} shown`}</Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const name = item.kind === "place" ? item.suggestion.mainText : item.destination.name;
          const region = item.kind === "place" ? item.suggestion.secondaryText : item.destination.region;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Select ${name}, ${region}`} disabled={selectingId !== null} onPress={() => void chooseResult(item)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
              <View style={styles.pin}><Text style={styles.pinText}>⌖</Text></View>
              <View style={styles.resultCopy}><Text style={styles.name}>{name}</Text><Text numberOfLines={2} style={styles.region}>{region}</Text></View>
              <Text style={styles.chevron}>{selectingId === item.id ? "…" : "›"}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={!searching ? <View style={styles.empty}><Text style={styles.emptyTitle}>No Indian destination matches that search.</Text><Text style={styles.emptyText}>Try another city, landmark, or state.</Text></View> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FBFCFB", flex: 1 },
  content: { alignSelf: "center", gap: 10, maxWidth: 760, padding: 20, paddingTop: 18, width: "100%" },
  intro: { color: "#607066", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  searchField: { alignItems: "center", backgroundColor: "#F1F5F2", borderRadius: 14, flexDirection: "row", gap: 8, paddingHorizontal: 14 },
  searchGlyph: { color: "#286240", fontSize: 23 },
  input: { color: "#1D2E22", flex: 1, fontSize: 15, paddingVertical: 14 },
  error: { backgroundColor: "#FCEDEB", borderRadius: 10, color: "#8B1E17", fontSize: 12, lineHeight: 18, padding: 10 },
  labelRow: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 10 },
  label: { color: "#68766D", flex: 1, fontSize: 10, ...font("800"), letterSpacing: 1.1 },
  resultCount: { color: "#68766D", fontSize: 11, ...font("700") },
  result: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E5EBE6", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 15 },
  pressed: { backgroundColor: "#F3F8F4" },
  pin: { alignItems: "center", backgroundColor: "#E5F2E8", borderRadius: 14, height: 32, justifyContent: "center", width: 32 },
  pinText: { color: "#196239", fontSize: 19, ...font("700") },
  resultCopy: { flex: 1, gap: 3 },
  name: { color: "#1C2C20", fontSize: 15, ...font("800") },
  region: { color: "#68766D", fontSize: 12 },
  chevron: { color: "#17633A", fontSize: 25 },
  empty: { backgroundColor: "#F2F6F3", borderRadius: 16, gap: 5, padding: 16 },
  emptyTitle: { color: "#35463B", fontSize: 14, ...font("800"), lineHeight: 20 },
  emptyText: { color: "#66736B", fontSize: 12, lineHeight: 17 },
});
