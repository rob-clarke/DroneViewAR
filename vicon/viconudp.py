from construct import Struct, Float64l, Int8ul, Int16ul, Int32ul, PaddedString, this

TrackerObject = Struct(
    "ItemName" / PaddedString(24,"utf8"),
    "TransX" / Float64l,
    "TransY" / Float64l,
    "TransZ" / Float64l,
    "RotX" / Float64l,
    "RotY" / Float64l,
    "RotZ" / Float64l,
)

TrackerItemHeader = Struct(
    "ItemID" / Int8ul,
    "ItemDataSize" / Int16ul
)

TrackerItem = Struct(
    "Header" / TrackerItemHeader,
    "Data" / TrackerObject
)

UDPStreamPacket = Struct(
    "FrameNumber" / Int32ul,
    "ItemsInBlock" / Int8ul,
    "Items" / TrackerItem[this.ItemsInBlock]
)
