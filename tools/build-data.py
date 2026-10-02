#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从仓库词库生成游戏数据文件 game/js/data.js(按年级分层)

数据来源:
  - 3500常用字.txt   -> 字表(常用字在前、次常用字在后,各按拼音排序)
  - 7000常用字.txt   -> 每个字的笔画数(含「N画」分组标记)
  - 一年级字表       -> 部编版一年级上册识字表(约300字,按教学顺序,内置在本脚本)

年级划分:
  1 一年级   = 部编版一年级上册识字表(教学顺序,过滤掉仓库词库里没有的字)
  2~六年级  = 其余常用字(常用2500 - 一年级)按笔画升序均分 5 份
  7 课外拓展 = 次常用1000字,按笔画升序

输出:
  game/js/data.js -> window.HZ_DATA = [ [字, 拼音(带声调), 笔画数, 年级], ... ]

重新生成:  pip install pypinyin && python tools/build-data.py
"""
import json
import re
import sys
from pathlib import Path

try:
    from pypinyin import pinyin, Style
except ImportError:
    sys.exit("缺少依赖 pypinyin,请先执行: python -m pip install pypinyin")

ROOT = Path(__file__).resolve().parents[2]
OUT_FILE = ROOT / "game" / "js" / "data.js"

# 部编版一年级上册识字表(约300字,按课本教学顺序手工整理;
# 不在本仓库词库里的字会在生成时自动过滤并打印提示)
GRADE1 = (
    "天地人你我他一二三四五上下口耳目手足站坐"
    "日月水火山石田禾对云雨风花鸟虫"
    "六七八九十爸妈马土不画打棋鸡词语句子桌纸文数学音乐妹奶白皮小桥台雪儿"
    "秋气树叶片大飞会个的船两头在里看见闪星"
    "江南可采莲鱼东西北尖说春青蛙夏弯就冬"
    "远有色近听无声去还来多少黄牛只猫边鸭苹果杏桃"
    "包尺作业本笔刀课早校明力尘从众双木林森条心"
    "升国旗中红歌起么美丽立"
    "影前后黑狗左右它好朋友"
    "比尾巴谁长短把兔伞公写诗点要过给当串们以"
    "数彩半空问到方没更绿出睡那海真老吗同什才亮时候"
    "觉自己很穿衣服快蓝又笑着向和贝娃挂活金"
    "群竹牙用几步为参加洞乌鸦处找办旁许法放进高"
    "住孩玩吧发芽爬呀久回全变"
)

GRADE_NAMES = {1: "一年级", 2: "二年级", 3: "三年级", 4: "四年级",
               5: "五年级", 6: "六年级", 7: "课外拓展"}


def is_han(ch: str) -> bool:
    return "一" <= ch <= "鿿"


def dedup(s: str):
    seen, out = set(), []
    for ch in s:
        if is_han(ch) and ch not in seen:
            seen.add(ch)
            out.append(ch)
    return out


def load_common():
    """3500常用字.txt:整文件过滤出汉字并去重(保留出现顺序)"""
    text = (ROOT / "3500常用字.txt").read_text(encoding="utf-8")
    seen, out = set(), []
    for ch in text:
        if is_han(ch) and ch not in seen:
            seen.add(ch)
            out.append(ch)
    return out


def load_strokes():
    """7000常用字.txt:解析 'N画' 分组行,得到 字->笔画数"""
    strokes, cur = {}, None
    for raw in (ROOT / "7000常用字.txt").read_text(encoding="utf-8").splitlines():
        line = raw.replace("　", "").strip()
        m = re.match(r"^(\d+)画$", line)
        if m:
            cur = int(m.group(1))
            continue
        if cur is None:
            continue
        line = re.sub(r"^〔[^〕]*〕", "", line)  # 去掉 〔部首〕 标记
        for ch in line:
            if is_han(ch) and ch not in strokes:
                strokes[ch] = cur
    return strokes


def main():
    common = load_common()
    strokes = load_strokes()
    common_set = set(common)

    # 常用/次常用分界:第二段(次常用)从「蔼」开始不再按拼音续排
    boundary = common.index("蔼") if "蔼" in common else len(common)
    common_part = common[:boundary]        # 常用 2500
    second_part = common[boundary:]        # 次常用 1000+

    # 一年级:内置字表 ∩ 仓库词库(保持教学顺序)
    g1_want = dedup(GRADE1)
    g1_missing = [c for c in g1_want if c not in common_set]
    g1 = [c for c in g1_want if c in common_set]

    # 二~六年级:剩余常用字按(笔画,原顺序)升序,均分 5 份
    g1_set = set(g1)
    rest = [c for c in common_part if c not in g1_set]
    rest.sort(key=lambda c: (strokes.get(c, 8), common_part.index(c)))
    chunk = (len(rest) + 4) // 5
    grades = [g1]
    for i in range(5):
        grades.append(rest[i * chunk:(i + 1) * chunk])
    # 课外拓展:次常用字按笔画升序
    second = sorted(second_part, key=lambda c: (strokes.get(c, 8), second_part.index(c)))
    grades.append(second)

    data = []
    for gi, chars in enumerate(grades, start=1):
        for c in chars:
            py = pinyin(c, style=Style.TONE, heteronym=False)[0][0]
            data.append([c, py, strokes.get(c, 8), gi])

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    js = "window.HZ_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT_FILE.write_text(js, encoding="utf-8")

    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    print(f"共 {len(data)} 字,输出 {OUT_FILE.relative_to(ROOT)}")
    for gi, chars in enumerate(grades, start=1):
        smin = min(strokes.get(c, 8) for c in chars)
        smax = max(strokes.get(c, 8) for c in chars)
        print(f"  {GRADE_NAMES[gi]}: {len(chars)} 字  笔画 {smin}~{smax}  "
              f"最早: {''.join(chars[:12])}")
    print("一年级最早 30 字:", "".join(g1[:30]))
    if g1_missing:
        print("⚠ 一年级字表中不在仓库词库、已过滤的字:", "".join(g1_missing))


if __name__ == "__main__":
    main()
