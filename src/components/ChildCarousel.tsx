import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    View,
    FlatList,
    Dimensions,
    StyleSheet,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Text,
} from "react-native";
import { colors } from "../styles/colors";
import ChildCard from "./ChildCard";

export type CarouselChild = {
    id: number;
    name: string;
    avatar?: string | null;
    korocoins?: number;
};

export type ChildCarouselProps = {
    data: CarouselChild[];
    itemWidth?: number;           // largeur visuelle de la card (sans overlap)
    horizontalPadding?: number;   // padding latéral pour s’aligner avec l’écran
    gap?: number;                 // espace entre cards (peut être négatif)
    a11yLabel?: string;
};

const ChildCarousel: React.FC<ChildCarouselProps> = ({
    data,
    itemWidth = 160,
    horizontalPadding = 20,
    gap = -40,                     // ← overlap esthétique
    a11yLabel = "child-carousel",
}) => {
    const listRef = useRef<FlatList<CarouselChild>>(null);
    const screenW = Dimensions.get("window").width;

    const CARD_W = itemWidth;
    const STEP = CARD_W + gap; // intervalle réel du “snap”
    const usableW = Math.max(0, screenW - horizontalPadding * 2);
    const totalW = data.length * CARD_W + Math.max(0, data.length - 1) * gap;

    const fitsOnScreen = totalW <= usableW;
    const [index, setIndex] = useState(0);

    // --- Calcul du nombre de pages pour les dots ---
    const pageCount = useMemo(() => {
        if (fitsOnScreen) return 1;
        return Math.max(1, Math.ceil(data.length));
    }, [fitsOnScreen, data.length]);

    // --- Rangée fixe (pas de carrousel) ---
    const StaticRow = useMemo(() => {
        const justify = data.length <= 2 ? "center" : "flex-start";
        return (
            <View
                style={[
                    styles.row,
                    { paddingHorizontal: horizontalPadding, justifyContent: justify },
                ]}
                accessibilityLabel={`${a11yLabel}-static`}
            >
                {data.map((item, i) => (
                    <View
                        key={item.id}
                        style={{
                            width: CARD_W,
                            marginRight: i < data.length - 1 ? gap : 0,
                        }}
                    >
                        <ChildCard
                            avatar={item.avatar ?? "🧒"}
                            name={item.name}
                            korocoins={item.korocoins ?? 0}
                        />
                    </View>
                ))}
            </View>
        );
    }, [data, horizontalPadding, CARD_W, gap, a11yLabel]);

    // --- Carrousel (overflow) ---
    const onMomentumEnd = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const x = e.nativeEvent.contentOffset.x;
            const next = Math.round(x / STEP);
            if (next !== index) setIndex(next);
        },
        [STEP, index]
    );

    const renderItem = useCallback(
        ({ item, index: i }: { item: CarouselChild; index: number }) => (
            <View style={{ width: CARD_W, marginRight: i < data.length - 1 ? gap : 0 }}>
                <ChildCard
                    avatar={item.avatar ?? "🧒"}
                    name={item.name}
                    korocoins={item.korocoins ?? 0}
                />
            </View>
        ),
        [CARD_W, gap, data.length]
    );

    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyWrap} accessibilityLabel={`${a11yLabel}-empty`}>
                <Text style={styles.emptyText}>Aucun enfant</Text>
            </View>
        );
    }

    if (fitsOnScreen) return StaticRow;

    return (
        <View style={[styles.root, { paddingHorizontal: horizontalPadding }]} accessibilityLabel={a11yLabel}>
            <FlatList
                ref={listRef}
                data={data}
                keyExtractor={(it) => String(it.id)}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={STEP}
                decelerationRate="fast"
                bounces={false}
                contentContainerStyle={{ paddingRight: Math.max(0, -gap) }}
                onMomentumScrollEnd={onMomentumEnd}
                getItemLayout={(_, i) => ({
                    length: STEP,
                    offset: STEP * i,
                    index: i,
                })}
            />

            {/* Dots */}
            <View style={styles.dots}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        width: "100%"
    },

    row: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
    },

    // --- Dots pagination ---
    dots: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#D6D6D6"
    },
    dotActive: {
        width: 16,
        borderRadius: 3,
        backgroundColor: colors.mediumBlue
    },

    // --- État vide ---
    emptyWrap: {
        width: "100%",
        paddingVertical: 24,
        alignItems: "center"
    },
    emptyText: {
        color: colors.mediumBlue,
        opacity: 0.7,
        fontSize: 14
    },
});


export default ChildCarousel;
