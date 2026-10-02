#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从仓库词库生成游戏数据文件 game/js/data.js(按新课标学段分层)

数据来源:
  - 3500常用字.txt   -> 字表(常用2500在前、次常用1000在后,各按拼音排序)
  - 7000常用字.txt   -> 每个字的笔画数(含「N画」分组标记)
  - 统编版语文(2024 新教材)识字表 -> 内置在本脚本(课本顺序):
      G1A  一年级上册识字表(280 字,人教 2024 版,经国家中小学智慧教育平台电子课本核对)
      G1X  一年级下册识字表(课本顺序,含多音字蓝色重出,官方计数 410)
      WS2S 二年级上册识字表(课本顺序)

年级划分(对照《义务教育语文课程标准(2022年版)》学段识字目标):
  1 一年级上册 = 一上识字表 ∩ 词库(课本顺序)
  2 一年级下册 = 一下识字表 ∩ 词库 - 一上(课本顺序)
  3 二年级     = 二上识字表 ∩ 词库 - 前面,再按笔画升序补齐到累计 1600(第一学段)
  4 三年级     = 按笔画升序补到累计 2050
  5 四年级     = 按笔画升序补到累计 2500(第二学段 ≈ 常用字 2500)
  6 五六年级   = 次常用字按笔画升序补到累计 3000(第三学段)
  7 课外拓展   = 其余全部字

输出:
  game/js/data.js -> window.HZ_DATA = [ [字, 拼音(带声调), 笔画数, 年级], ... ]

重新生成:  python -m pip install pypinyin && python tools/build-data.py
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

# 统编版一年级上册识字表(280 字,课本顺序;不在仓库词库里的字会自动过滤并提示)
G1A = (
    "天地人你我他一二三四五上下口耳目手足站坐日月山川水火田禾六七八九"
    "十爸妈大马路土本学校班级姓名王哥弟画花打棋积木字词句子桌纸读书鱼"
    "鸭乌鸦午星期语文数写会晚昨今明个这去年秋气了树叶黄片从来飞江南可"
    "采莲戏间东北的家鸡竹牙用几步没参加鸟说是春青蛙夏着皮就冬男女关正"
    "反先后内外对歌雨风虫清绿桃红力尖尘众双林森不条心金包尺作业笔刀宝"
    "贝少课早升国旗中们声起多么向立老师工厂医院生门卫白菜西瓜果小桥流"
    "柳开雪夜色美蓝云草原冰自行车船弯儿两头在里看见闪影前常黑狗左右它"
    "好朋友件有和做也办到又才能爷奶叔姐妹比尾巴谁长短把伞兔最公喝只处"
    "找许石出法放进高点彩半空问回答方久更牛羊爪元拼音"
)

# 统编版一年级下册识字表(课本顺序,含多音字重出;官方计数 410 个生字)
G1X = (
    "霜吹落降飘游池入氏什李张弓古胡吴言孙河晴眼睛保护苗吃事情请让猜边"
    "凉喜欢时怕攻令感动万无识组计算减式图形卡合唱团热爱共产党太阳光怀"
    "抱幸福成井城村毛主席住乡亲战士想念告诉走京座安广场非宽丽洁认连选"
    "圈涂填试练玩得急直哭跟忽然听喊快已背只很孤单种每都邻居叫招呼乐怎"
    "独跳绳当还羽球劲轮排母页止斤寸丁千全旦静思床疑举望低故胆敢勇讲窗"
    "乱拉样笑再睡觉端粽节总煮盼米枣甜分鲜肉了册支台电视部机衣裤被物捉"
    "迷藏造蚂蚁运食粮房结网圆严寒酷暑暖晨细朝霞夕杨香操拔拍跑踢铃真闹"
    "丢沙身体之初相近习远教道专幼玉知义饭饱茶泡轻穿袍鞭炮诗首偷浮萍泉"
    "惜照柔荷露角浪迈悄泪次给壳虾装像淘娃珠摇篮亮晶停坪展透翅膀朵耍腰"
    "阴沉呀忙呢吗面空闷吧消息棍豆汤蚊扇椅牵织斗具铅新平盒些此仔检查所"
    "伙伴钟迟灯等啊决定经位表虎熊通注意遍百为因舌理忘第猴块兴掰扛往棵"
    "满扔摘捧追刷梳巾皂洗澡脸盆棉姑娘病她治燕帮害别干惊奇咕咚熟掉湖吓"
    "啦鹿象野拦哪那领壁借咬难爬您拨赶摆过孩转吵现顶胖票户交父"
)

# 统编版二年级上册识字表(课本顺序)
WS2S = (
    "蝌蚪脑袋灰甩活腿教迎嘴龟披蹲肚鼓汽越温滴奔海洋发坏没庄稼屋带灾种"
    "管植如为脚旅准备送纷挂挺钻底炸离粗得雾暴雷阵冻夹帆港湾塘稻行垂园"
    "溪丛翠群队铜号榕壮梧桐掌枫松柏桦守银杏杉化桂世界孔雀锦雄鹰翔雁深"
    "猛灵休猫季蝴蝶麦嫩肥农勤归戴场谷虽辛苦制恨诚虚假漠助贫富饥永虹浇"
    "壶提洒挑镜拿系荡裙婆候趣舅或留份喂逃曲者服扑鼻珍碧靠仰颗距变祖勺"
    "绕转楚汉刻研钢琴捏泥围滚铁环滑梯登唐依尽欲穷层瀑布炉紫烟遥闻景区"
    "省秀神仙盘指巨伸都著抢状岩潭茂盛胜央岛隐约倒映整童吸引客葡萄沟坡"
    "密枝淡好族够收市干钉分颜味效丰昌付卧铺改签退更维码观沿渴话弄错际"
    "抬信当鹊寻枯却劝刮死将且狂冷重复哀唤葫芦谢以盯赛怪慢救摩托防渔货"
    "科考察楼艰斗代临腊军薄章握凝觉油辉革命利朱德扁担同志伍敌根据抽陡"
    "鞋疼敬泼民度特周恩敲龙串容踩始碗祝寿刘兰派由于卖员捕买似踏烈荣岁"
    "题蜜峰蜂爆争抄炒幕墓慕绝径踪灭舟钓庐笼盖苍茫论暗岸街梁甚至切躲该"
    "悠闲散失堆累添柴烧旺闭哎旁冲哇终浑淋晒饿沼泽宁杠杆栋库闸羔蝗称赞"
    "刺猬板凳但极傍苹泄接除疲劳筝鼠折漂扎乘抓线莓俩架受愿朝取撞怨软呜"
    "慈祥量跌摔擦咱推驶坚硬猩鹤蛇鸽蚕蚯蚓骆驼狮"
)

# 个别课文核心字不在仓库词库文件里,手工补上(字->笔画数);只随教材字表进入对应年级
EXTRA_CHARS = {"粽": 14, "咚": 8, "莓": 10}

# 累计识字量目标(2022 课标):第一学段 1600 / 第二学段 2500 / 第三学段 3000
CUM_TARGETS = {3: 1600, 4: 2050, 5: 2500, 6: 3000}

GRADE_NAMES = {1: "一年级上册", 2: "一年级下册", 3: "二年级", 4: "三年级",
               5: "四年级", 6: "五六年级", 7: "课外拓展"}


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
    strokes.update(EXTRA_CHARS)
    common_set = set(common) | set(EXTRA_CHARS)   # 让教材字表里的补充字能通过过滤
    pos = {c: i for i, c in enumerate(common)}

    # 常用/次常用分界:第二段(次常用)从「蔼」开始不再按拼音续排
    boundary = common.index("蔼") if "蔼" in common else len(common)
    common_part = common[:boundary]        # 常用 2500
    second_part = common[boundary:]        # 次常用 1000+

    used = set()
    grades, missing = {}, []

    def take(source, gi, name):
        want = dedup(source)
        miss = [c for c in want if c not in common_set]
        hit = [c for c in want if c in common_set and c not in used]
        used.update(hit)
        grades[gi] = hit
        if miss:
            missing.append((name, "".join(miss)))
        return hit

    # 1~2 年级:直接用教材识字表(课本顺序)
    take(G1A, 1, "一年级上册")
    take(G1X, 2, "一年级下册")
    # 二年级:二上识字表在先,再按笔画升序补到累计 1600(第一学段)
    take(WS2S, 3, "二年级上册")

    # 剩余常用字按(笔画,原顺序)升序,逐档补齐累计识字量
    pool = [c for c in common_part if c not in used]
    pool.sort(key=lambda c: (strokes.get(c, 8), pos[c]))
    cumulative = len(used)
    pi = 0
    for gi in (3, 4, 5):
        need = CUM_TARGETS[gi] - cumulative
        grades.setdefault(gi, [])
        take_n = pool[pi:pi + max(0, need)]
        pi += len(take_n)
        grades[gi].extend(take_n)
        used.update(take_n)
        cumulative = len(used)

    # 五六年级:剩余字(含没用完的常用字+次常用字)按笔画升序补到累计 3000
    rest = [c for c in common if c not in used]
    rest.sort(key=lambda c: (strokes.get(c, 8), pos[c]))
    grades[6] = rest[:CUM_TARGETS[6] - len(used)]
    # 课外拓展:其余全部
    grades[7] = rest[CUM_TARGETS[6] - len(used):]

    data = []
    for gi in range(1, 8):
        for c in grades[gi]:
            py = pinyin(c, style=Style.TONE, heteronym=False)[0][0]
            data.append([c, py, strokes.get(c, 8), gi])

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    js = "window.HZ_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT_FILE.write_text(js, encoding="utf-8")

    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    print(f"共 {len(data)} 字,输出 {OUT_FILE.relative_to(ROOT)}")
    cum = 0
    for gi in range(1, 8):
        chars = grades[gi]
        cum += len(chars)
        smin = min(strokes.get(c, 8) for c in chars)
        smax = max(strokes.get(c, 8) for c in chars)
        print(f"  {GRADE_NAMES[gi]}: {len(chars)} 字  累计 {cum}  笔画 {smin}~{smax}  "
              f"开头: {''.join(chars[:12])}")
    print("一年级上册前 30 字:", "".join(grades[1][:30]))
    print("一年级下册前 30 字:", "".join(grades[2][:30]))
    for name, miss in missing:
        print(f"⚠ {name}识字表中不在仓库词库、已过滤的字:", miss)


if __name__ == "__main__":
    main()
