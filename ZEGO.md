// ... some other logic code
const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");
const kitToken =  ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID,  randomID(5),  randomID(5));
const zp = ZegoUIKitPrebuilt.create(kitToken);
zp.joinRoom({
   container: element,
   sharedLinks: [
          {
            name: 'Personal link',
            url:
            window.location.protocol + '//' + 
            window.location.host + window.location.pathname +
              '?roomID=' +
              roomID,
          },
    ],
   scenario: {
          mode: ZegoUIKitPrebuilt.GroupCall, // To implement 1-on-1 calls, modify the parameter here to [ZegoUIKitPrebuilt.OneONoneCall].
    },
});  
// ... some other logic code