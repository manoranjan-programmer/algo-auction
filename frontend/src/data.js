export const tiers = [
    {
        title: "Tier 1 – Elite", items: [
            { name: "TimSort", scores: [9, 9, 10, 8, 9, 8, 9, 7, 9, 9] },
            { name: "Merge Sort", scores: [9, 9, 8, 8, 9, 7, 9, 7, 8, 9] },
            { name: "Quick Sort", scores: [9, 9, 7, 5, 8, 7, 9, 7, 8, 8] },
            { name: "Heap Sort", scores: [8, 8, 7, 7, 8, 6, 8, 6, 7, 8] },
            { name: "Intro Sort", scores: [9, 9, 8, 7, 9, 7, 9, 7, 8, 9] },
            { name: "Dual Pivot Quick", scores: [8, 9, 7, 6, 8, 7, 9, 6, 8, 8] },
            { name: "Block Sort", scores: [8, 8, 7, 7, 8, 6, 8, 6, 7, 8] },
            { name: "Smooth Sort", scores: [7, 8, 8, 7, 7, 6, 7, 6, 6, 7] },
            { name: "Library Sort", scores: [8, 8, 7, 7, 8, 6, 8, 6, 7, 8] },
            { name: "Grail Sort", scores: [8, 8, 7, 7, 8, 6, 8, 6, 7, 7] }
        ]
    },
    {
        title: "Tier 2 – Strong", items: [
            { name: "Radix Sort", scores: [8, 9, 7, 7, 9, 10, 9, 2, 1, 8] },
            { name: "Counting Sort", scores: [7, 8, 6, 6, 9, 10, 2, 1, 1, 7] },
            { name: "Bucket Sort", scores: [8, 8, 7, 7, 6, 6, 5, 9, 2, 7] },
            { name: "Flash Sort", scores: [7, 8, 6, 6, 7, 6, 6, 4, 3, 7] },
            { name: "Pigeonhole Sort", scores: [6, 7, 5, 5, 8, 9, 1, 1, 1, 6] },
            { name: "Spread Sort", scores: [8, 8, 7, 7, 8, 7, 8, 4, 4, 8] },
            { name: "American Flag", scores: [7, 8, 6, 6, 7, 8, 7, 2, 1, 7] },
            { name: "Cartesian Tree", scores: [6, 6, 6, 5, 6, 5, 6, 4, 4, 6] },
            { name: "Strand Sort", scores: [7, 6, 7, 5, 6, 5, 6, 4, 5, 6] },
            { name: "Comb Sort", scores: [6, 5, 6, 5, 6, 5, 6, 4, 5, 6] }
        ]
    },
    {
        title: "Tier 3 – Basic", items: [
            { name: "Insertion Sort", scores: [8, 2, 9, 3, 6, 6, 2, 4, 5, 6] },
            { name: "Selection Sort", scores: [6, 2, 6, 3, 5, 5, 2, 3, 4, 5] },
            { name: "Bubble Sort", scores: [6, 1, 7, 2, 5, 5, 1, 3, 4, 5] },
            { name: "Shell Sort", scores: [7, 5, 7, 6, 6, 6, 5, 5, 6, 7] },
            { name: "Cocktail Sort", scores: [6, 1, 7, 2, 5, 5, 1, 3, 4, 5] },
            { name: "Gnome Sort", scores: [6, 1, 7, 2, 5, 5, 1, 3, 4, 5] },
            { name: "Odd-Even Sort", scores: [6, 2, 6, 3, 5, 5, 2, 3, 4, 5] },
            { name: "Cycle Sort", scores: [6, 3, 6, 4, 5, 5, 3, 3, 4, 5] },
            { name: "Pancake Sort", scores: [6, 2, 6, 3, 5, 5, 2, 3, 4, 5] },
            { name: "Tree Sort", scores: [7, 4, 6, 4, 6, 5, 4, 4, 5, 6] }
        ]
    },
    {
        title: "Tier 4 – Wildcards", items: [
            { name: "Bogo Sort", scores: [2, 0, 3, 1, 2, 1, 0, 0, 0, 1] },
            { name: "Bozo Sort", scores: [2, 0, 3, 1, 2, 1, 0, 0, 0, 1] },
            { name: "Stalin Sort", scores: [4, 1, 6, 2, 3, 3, 1, 2, 2, 3] },
            { name: "Sleep Sort", scores: [3, 1, 3, 2, 2, 2, 1, 1, 0, 2] },
            { name: "Miracle Sort", scores: [1, 0, 10, 0, 1, 1, 0, 0, 0, 1] },
            { name: "Slow Sort", scores: [3, 1, 4, 2, 3, 2, 1, 1, 1, 2] },
            { name: "Stooge Sort", scores: [3, 1, 4, 2, 3, 2, 1, 1, 1, 2] },
            { name: "Thanos Sort", scores: [4, 1, 4, 2, 3, 2, 1, 1, 1, 3] },
            { name: "Quantum Bogo", scores: [1, 0, 2, 0, 1, 0, 0, 0, 0, 0] },
            { name: "Intelligent Design", scores: [2, 0, 3, 1, 2, 1, 0, 0, 0, 1] }
        ]
    }
];

export const datasets = [
    "Small Random", "Large Random", "Nearly Sorted", "Reverse Sorted",
    "Many Duplicates", "Small Range", "Wide Range", "Floating Data",
    "Strings", "Mixed Size"
];
