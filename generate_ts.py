import math

# Let's create an expressive, high-precision SVG calligraphy logo for "ArtDeejay"
# ViewBox: 0 0 1000 420

# We can express the logo geometry as a masterwork of calligraphic bezier curves.
# Each letter is constructed with filled ribbon geometry (both outer and inner edges)
# to give the exact appearance of a master brush/chisel calligraphy signature.

# 1. Letter 'A':
# Left flourish & stem, ascending arch, bold descending downstroke, and energetic loop crossbar.
path_A = (
    "M 102 152 "
    "C 108 130, 118 108, 132 108 "
    "C 142 108, 146 126, 142 150 "
    "C 136 186, 124 235, 114 276 "
    "C 110 292, 102 296, 96 288 "
    "C 92 282, 94 268, 104 236 "
    "C 114 204, 124 162, 126 138 "
    "C 127 126, 124 120, 118 126 "
    "C 110 134, 104 154, 102 152 Z "
    "M 106 284 "
    "C 124 274, 154 208, 182 136 "
    "C 192 110, 202 82, 214 82 "
    "C 222 82, 226 94, 224 116 "
    "C 220 156, 206 224, 214 262 "
    "C 218 280, 230 284, 240 274 "
    "C 246 268, 248 258, 242 258 "
    "C 236 258, 230 264, 226 254 "
    "C 220 236, 230 178, 236 134 "
    "C 240 106, 234 94, 222 96 "
    "C 210 98, 198 126, 186 160 "
    "C 160 232, 128 288, 106 284 Z "
    "M 172 214 "
    "C 162 216, 154 224, 158 232 "
    "C 162 238, 174 238, 190 230 "
    "C 208 220, 232 208, 252 212 "
    "C 258 214, 260 210, 256 206 "
    "C 248 198, 220 200, 194 208 "
    "C 182 212, 176 213, 172 214 Z"
)

# 2. Letter 'r':
path_r = (
    "M 250 210 "
    "C 258 198, 266 178, 276 176 "
    "C 284 174, 288 180, 284 190 "
    "C 280 204, 274 220, 282 222 "
    "C 290 224, 298 212, 308 206 "
    "C 314 202, 316 206, 312 212 "
    "C 300 226, 284 234, 272 228 "
    "C 264 224, 266 210, 270 196 "
    "C 272 188, 268 186, 264 190 "
    "C 258 198, 252 208, 248 214 Z"
)

# 3. Letter 't':
path_t = (
    "M 314 208 "
    "C 322 184, 332 144, 338 126 "
    "C 342 116, 348 116, 348 124 "
    "C 346 142, 336 196, 334 230 "
    "C 332 252, 340 258, 352 252 "
    "C 360 248, 364 242, 362 238 "
    "C 358 238, 354 242, 348 244 "
    "C 342 246, 338 240, 340 222 "
    "C 342 198, 350 148, 352 128 "
    "C 354 110, 340 108, 332 122 "
    "C 324 138, 316 182, 310 212 Z "
    "M 302 178 "
    "C 318 174, 344 172, 366 170 "
    "C 372 170, 374 174, 368 176 "
    "C 348 180, 322 182, 302 184 "
    "C 296 184, 296 180, 302 178 Z"
)

# 4. Letter 'D':
path_D = (
    "M 408 102 "
    "C 414 122, 410 162, 404 208 "
    "C 398 252, 394 276, 386 282 "
    "C 378 288, 370 284, 368 274 "
    "C 366 262, 374 252, 384 254 "
    "C 392 256, 396 266, 392 274 "
    "C 394 272, 398 258, 402 232 "
    "C 408 190, 414 138, 412 110 "
    "C 410 92, 400 96, 394 104 "
    "C 390 102, 394 92, 406 88 "
    "C 414 86, 420 90, 420 98 "
    "C 418 106, 414 116, 412 128 "
    "C 434 102, 464 84, 492 84 "
    "C 522 84, 544 108, 544 146 "
    "C 544 196, 508 266, 452 284 "
    "C 424 292, 396 288, 388 282 "
    "C 384 278, 388 272, 394 274 "
    "C 412 282, 442 278, 470 258 "
    "C 512 228, 532 176, 532 142 "
    "C 532 116, 516 98, 492 98 "
    "C 468 98, 442 116, 422 144 "
    "C 416 154, 412 162, 408 174 Z"
)

# 5. Letters 'ee':
path_ee = (
    "M 498 226 "
    "C 508 206, 520 182, 534 182 "
    "C 544 182, 548 192, 542 208 "
    "C 530 236, 506 244, 494 238 "
    "C 490 236, 492 230, 498 226 Z "
    "M 534 190 "
    "C 526 190, 518 202, 512 218 "
    "C 526 216, 536 208, 538 198 "
    "C 538 194, 536 190, 534 190 Z "
    "M 526 238 "
    "C 538 238, 548 226, 554 212 "
    "C 564 192, 574 182, 586 182 "
    "C 596 182, 600 192, 594 208 "
    "C 582 236, 558 246, 542 242 "
    "C 536 240, 536 236, 542 234 Z "
    "M 586 190 "
    "C 578 190, 570 202, 564 218 "
    "C 578 216, 588 208, 590 198 "
    "C 590 194, 588 190, 586 190 Z"
)

# 6. Letter 'j':
path_j = (
    "M 584 236 "
    "C 594 222, 606 198, 614 186 "
    "C 620 178, 626 182, 624 192 "
    "C 618 218, 614 266, 610 318 "
    "C 606 364, 598 382, 586 382 "
    "C 574 382, 566 368, 574 350 "
    "C 586 322, 610 274, 620 228 "
    "C 622 220, 626 220, 624 228 "
    "C 614 270, 594 316, 582 344 "
    "C 578 354, 580 364, 588 364 "
    "C 594 364, 600 350, 604 316 "
    "C 608 266, 612 218, 616 194 "
    "C 612 202, 602 222, 592 238 Z "
    "M 628 152 "
    "C 632 146, 640 148, 638 156 "
    "C 636 162, 628 162, 626 156 "
    "C 626 154, 626 152, 628 152 Z"
)

# 7. Letter 'a':
path_a = (
    "M 646 206 "
    "C 656 192, 672 182, 686 182 "
    "C 696 182, 700 190, 696 206 "
    "C 690 230, 686 248, 694 248 "
    "C 700 248, 706 238, 714 226 "
    "C 718 222, 722 224, 718 230 "
    "C 708 244, 696 254, 686 254 "
    "C 676 254, 676 242, 682 220 "
    "C 672 238, 658 248, 646 248 "
    "C 634 248, 628 236, 632 220 "
    "C 636 204, 646 192, 658 190 "
    "C 666 188, 674 194, 678 204 "
    "C 674 216, 664 234, 650 236 "
    "C 642 238, 638 232, 640 222 "
    "C 642 214, 644 208, 646 206 Z"
)

# 8. Letter 'y':
path_y = (
    "M 714 228 "
    "C 724 214, 734 196, 742 184 "
    "C 746 178, 752 182, 750 190 "
    "C 744 212, 740 232, 746 236 "
    "C 752 240, 762 226, 770 212 "
    "C 776 202, 782 184, 788 184 "
    "C 792 184, 792 192, 788 206 "
    "C 778 242, 766 296, 756 344 "
    "C 750 374, 740 388, 728 388 "
    "C 716 388, 710 374, 718 356 "
    "C 730 328, 750 286, 760 248 "
    "C 762 240, 766 240, 764 248 "
    "C 754 286, 736 328, 726 352 "
    "C 722 362, 724 370, 730 370 "
    "C 736 370, 742 358, 748 334 "
    "C 758 288, 772 230, 780 200 "
    "C 772 214, 758 244, 744 244 "
    "C 734 244, 732 232, 738 214 "
    "C 742 202, 744 194, 746 190 "
    "C 740 200, 730 220, 718 232 Z"
)

# 9. Flourish (Underline brush swoosh):
path_flourish = (
    "M 292 286 "
    "C 334 316, 420 354, 532 366 "
    "C 644 378, 768 370, 874 344 "
    "C 918 334, 958 320, 978 308 "
    "C 984 304, 986 308, 980 312 "
    "C 956 328, 912 344, 864 356 "
    "C 758 382, 632 390, 522 378 "
    "C 412 366, 328 328, 288 296 "
    "C 284 292, 286 288, 292 286 Z"
)

all_filled_path = f"{path_A} {path_r} {path_t} {path_D} {path_ee} {path_j} {path_a} {path_y} {path_flourish}"

# Now let's define the spine guide paths for the reveal mask:
# Each spine has a stroke-width of 48-56, round caps, so when strokeDashoffset runs, it reveals that exact part.
reveal_strokes = [
    # Section 1: Initial left letter 'A' and flourishes
    {
        "id": "stroke-a-flourish",
        "section": 1,
        "d": "M 106 148 C 114 116 128 104 138 114 C 146 126 138 174 122 234 C 112 272 102 292 98 284",
        "strokeWidth": 46,
        "durationRatio": 0.12,
        "description": "A left flourish"
    },
    {
        "id": "stroke-a-main",
        "section": 1,
        "d": "M 104 280 C 132 264 162 194 192 120 C 206 86 220 80 224 96 C 228 126 216 198 220 252 C 222 276 236 280 244 266",
        "strokeWidth": 52,
        "durationRatio": 0.16,
        "description": "A arch and downstroke"
    },
    {
        "id": "stroke-a-cross",
        "section": 1,
        "d": "M 166 224 C 182 220 216 208 252 210",
        "strokeWidth": 42,
        "durationRatio": 0.06,
        "description": "A loop connecting to r"
    },
    # Section 2: Middle part ('r', 't', 'D')
    {
        "id": "stroke-r",
        "section": 2,
        "d": "M 250 210 C 262 188 274 174 282 180 C 288 188 278 214 284 222 C 292 224 302 214 314 208",
        "strokeWidth": 46,
        "durationRatio": 0.08,
        "description": "r letter"
    },
    {
        "id": "stroke-t-stem",
        "section": 2,
        "d": "M 314 208 C 326 172 336 132 344 118 C 348 124 340 188 336 226 C 334 250 344 256 358 248",
        "strokeWidth": 48,
        "durationRatio": 0.09,
        "description": "t stem and exit hook"
    },
    {
        "id": "stroke-t-bar",
        "section": 2,
        "d": "M 300 180 L 370 172",
        "strokeWidth": 38,
        "durationRatio": 0.05,
        "description": "t crossbar"
    },
    {
        "id": "stroke-d-stem",
        "section": 2,
        "d": "M 410 94 C 416 130 408 190 398 252 C 392 278 374 284 372 268 C 370 256 384 254 394 266",
        "strokeWidth": 48,
        "durationRatio": 0.09,
        "description": "D spine and base loop"
    },
    {
        "id": "stroke-d-bowl",
        "section": 2,
        "d": "M 394 270 C 428 290 480 274 518 226 C 542 192 542 136 524 104 C 504 80 460 84 424 122 C 412 138 408 160 408 174",
        "strokeWidth": 52,
        "durationRatio": 0.14,
        "description": "D generous bowl"
    },
    # Section 3: Right part ('e', 'e', 'j', 'a', 'y')
    {
        "id": "stroke-e1",
        "section": 3,
        "d": "M 500 230 C 514 204 528 180 540 184 C 548 194 532 232 506 240 C 524 242 544 234 554 218",
        "strokeWidth": 44,
        "durationRatio": 0.07,
        "description": "first e"
    },
    {
        "id": "stroke-e2",
        "section": 3,
        "d": "M 554 218 C 566 196 578 182 590 184 C 598 194 584 232 556 242 C 574 244 590 234 602 218",
        "strokeWidth": 44,
        "durationRatio": 0.07,
        "description": "second e"
    },
    {
        "id": "stroke-j-body",
        "section": 3,
        "d": "M 596 230 C 612 206 622 184 624 190 C 618 228 610 292 604 350 C 598 382 578 380 574 358 C 570 334 596 288 622 226",
        "strokeWidth": 48,
        "durationRatio": 0.11,
        "description": "j descender and loop"
    },
    {
        "id": "stroke-j-dot",
        "section": 3,
        "d": "M 628 152 L 634 156",
        "strokeWidth": 32,
        "durationRatio": 0.03,
        "description": "j tittle"
    },
    {
        "id": "stroke-a-body",
        "section": 3,
        "d": "M 648 204 C 660 186 680 180 692 188 C 698 202 688 238 692 248 C 680 252 642 250 634 222 C 630 200 652 188 678 192 C 686 210 690 236 714 226",
        "strokeWidth": 46,
        "durationRatio": 0.09,
        "description": "a counter and stem"
    },
    {
        "id": "stroke-y-body",
        "section": 3,
        "d": "M 714 226 C 728 206 740 184 748 188 C 748 208 742 232 752 238 C 764 240 780 202 788 188 C 790 206 776 270 762 334 C 752 376 728 386 718 368 C 712 344 736 296 764 246",
        "strokeWidth": 48,
        "durationRatio": 0.12,
        "description": "y cup and descender loop"
    },
    # Section 4: Finishing bottom flourish
    {
        "id": "stroke-flourish",
        "section": 4,
        "d": "M 290 290 C 342 324 436 364 550 374 C 674 384 804 372 906 342 C 948 328 976 312 982 308",
        "strokeWidth": 44,
        "durationRatio": 0.18,
        "description": "finishing bottom flourish swoosh"
    }
]

# Write out src/data/logoData.ts
ts_content = f'''/**
 * ArtDeejay Signature Vector Logo & Animation Geometry
 */

export const LOGO_VIEWBOX = "0 0 1000 420";

export const LOGO_FILLED_PATH = `{all_filled_path}`;

export interface RevealStroke {{
  id: string;
  section: 1 | 2 | 3 | 4;
  d: string;
  strokeWidth: number;
  durationRatio: number;
  description: string;
}}

export const REVEAL_STROKE_PATHS: RevealStroke[] = {repr(reveal_strokes).replace("'", '"')};
'''

with open('src/data/logoData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("Generated src/data/logoData.ts successfully.")
