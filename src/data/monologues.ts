// ACTORVERSE — Teleprompter monologue library (Phases 2–3)
// Fourteen short ORIGINAL monologues written for this app. They are
// practice texts, not copied from any other work. Each takes about 1-2
// minutes to perform aloud.

export interface Monologue {
  id: string;
  title: string;
  character: string;
  text: string;
}

export const MONOLOGUES: Monologue[] = [
  {
    id: "last-train-home",
    title: "The Last Train Home",
    character: "A traveller at a night station",
    text: `I have been standing on this platform for one hour. One hour, and no train. The board says delayed. The board always says delayed. But I am not angry. Not tonight. Tonight, for the first time in ten years, I am not in a hurry. My mother is waiting at home with dinner. My father will ask about my job. My little sister will steal my phone and hide it behind the sofa. And I will laugh. I will laugh like I used to, before the city taught me to walk fast and talk faster. So let the train be late. Let it be very late. Because tonight, I am going home. And home has been waiting for me longer than I have been waiting for this train.`,
  },
  {
    id: "fathers-shop",
    title: "My Father's Shop",
    character: "A son taking over a small shop",
    text: `This shop is forty years old. My father opened it with one shelf, three customers, and a dream bigger than this whole street. People laughed at him. They said, a small shop cannot feed a family. But he stayed. Every morning at six, he opened the shutter. Every night at ten, he closed it. Rain or heat, good days or bad days, he was here. And now he hands me the keys. He says, son, the shop is yours. And I look at these shelves, and I see his whole life. I see his tired hands. I see his honest heart. So I will not sell this shop. I will not change its name. I will stand here every morning at six, just like him. And one day, I will hand these keys to my own child.`,
  },
  {
    id: "the-interview",
    title: "The Interview",
    character: "A nervous young actor at an audition",
    text: `Good morning. My name is... sorry. Sorry, I am a little nervous. I have waited for this day for three years. Three years of practice in front of a broken mirror in my small room. My friends said, acting is not a real job. My uncle said, go and do something serious. But I could not listen to them. Because when I act, I feel alive. When I say someone else's words, I understand my own feelings. So please, give me one chance. Just one scene. If I am bad, I will leave quietly and never come back. But if you see something in me... if you see even a small spark... then I promise you, I will work harder than anyone you have ever met.`,
  },
  {
    id: "rain-in-the-village",
    title: "Rain in the Village",
    character: "A farmer waiting for rain",
    text: `The sky is full of clouds, but not one drop of rain. I look up every morning, and every morning the clouds run away. My field is dry. My crops are thirsty. My children ask me, father, when will it rain? And I have no answer. I only have hope. My grandfather told me, a farmer never loses hope. The rain will come. It always comes. Maybe tomorrow. Maybe next week. But until then, I will wake up before the sun, I will work in this dry field, and I will wait. Because waiting is also work. Hoping is also work. And one day, when the first drop falls on my face, I will laugh, and my children will dance in the mud.`,
  },
  {
    id: "letter-never-sent",
    title: "The Letter I Never Sent",
    character: "A letter to an old friend",
    text: `Dear friend, I wrote this letter ten times, and I never sent it. Not once. Because every time I finished it, I thought, what if you do not remember me? What if you have moved on? We were best friends. We shared one lunch box. We copied each other's homework. We promised we would never lose touch. And then life happened. New cities. New jobs. New people. I still think about you when I pass our old school. I still smile when I hear your favourite song. So here it is, my eleventh letter. This time, I am sending it. If you get this, call me. We have ten years to catch up on.`,
  },
  {
    id: "first-day-on-stage",
    title: "First Day on Stage",
    character: "A young performer before the curtain",
    text: `Behind this curtain, my heart is beating so fast I can hear it in my ears. Two hundred people are sitting out there. Two hundred strangers, waiting for me. Five minutes ago, I wanted to run away. I wanted to say, I am sick, I cannot do this. But then I remembered why I am here. I am here because a stage is the only place where I am not afraid to be myself. Out there, in the real world, I am quiet. I am shy. But on stage, I can be loud. I can be brave. I can be anyone. So curtain, open. Lights, come on. Let them watch. This is my first day on stage, and I will never forget it.`,
  },
  {
    id: "bus-stop-promise",
    title: "The Bus Stop Promise",
    character: "Two old friends meet after twenty years",
    text: `You! Is it really you? After twenty years, at the same bus stop, at the same time? I cannot believe my eyes. We used to wait here every morning before school. You always had one extra biscuit, and I always stole it. We promised each other that we would become great men. You would be a doctor. I would be a pilot. And look at us now. You sell vegetables in the market. I drive this very bus. But you know what? We are still here. We are still alive. We are still friends. So tell me, old friend, do you still have one extra biscuit? Because I am still hungry.`,
  },
  {
    id: "mothers-hands",
    title: "My Mother's Hands",
    character: "A son speaks about his mother",
    text: `Look at my mother's hands. They are rough. They are tired. They have washed a thousand plates. They have stitched a hundred torn shirts. They have held my hand on my first day of school, and they held my hand when I was sick at night. My mother never went to a big school. She never wore expensive clothes. But her hands built our whole home. Every brick of this house knows her touch. So when people ask me who my hero is, I do not say a film star. I do not say a cricketer. I say, my mother. And I say it with pride, because her hands are the reason I am standing here today.`,
  },
  {
    id: "the-last-ball",
    title: "The Last Ball",
    character: "A batsman needs one run to win",
    text: `One ball left. One run to win. The whole ground is quiet. My team is standing at the boundary, praying. My mother is watching from home, holding her breath. And I am standing here, bat in hand, sweat on my face. The bowler is running in. Fast. Very fast. But I am not afraid. Because I have practised this moment a thousand times in my small street, with a tennis ball and a broken bat. This is not pressure. This is my moment. The ball comes... I swing... and I hear the sound. The sweet sound of the bat. The ball flies. The crowd stands up. And I run. I run like I have never run before.`,
  },
  {
    id: "a-new-city",
    title: "A New City",
    character: "A young person arrives in Karachi",
    text: `I stepped off the bus with one bag, two hundred rupees, and a dream bigger than this whole city. Karachi. So many people. So many lights. So many cars, all in a hurry. A man asked me, boy, where are you going? And I said, I don't know yet. But I know one thing. I did not come here to go back. I came here to learn. To work. To become someone my village can be proud of. Yes, I am afraid. Yes, I am alone. But every big building in this city started with one brick. And today, I am that one brick. Watch me. One day, this city will know my name.`,
  },
  {
    id: "the-honest-thief",
    title: "The Honest Thief",
    character: "A thief returns what he stole",
    text: `Yes, officer. I stole the money. I will not lie. I took it from the shop at night, and I ran. But then I opened the bag, and I saw something I did not expect. Inside the bag, there was a letter. A letter from a father to his son, saving money for his son's school fees. And I thought of my own father. He also saved money for my school. He also worked day and night. So I came back. Here is the money. All of it. I did not spend one rupee. Arrest me if you want. But please, give this letter back to that father. Tell him his money is safe. Tell him... tell him a thief once had a heart too.`,
  },
  {
    id: "grandmothers-stories",
    title: "Grandmother's Stories",
    character: "A grandchild remembers their grandmother",
    text: `My grandmother used to tell me stories every night. Stories of kings and queens, of clever foxes and brave girls. I would lie beside her, and her voice would carry me to faraway lands. She is not with us anymore. Her chair is empty. Her room is quiet. But sometimes, when the night is dark and I cannot sleep, I close my eyes and I hear her voice again. Once upon a time... And I smile. Because stories never die. People die. But stories live in the hearts of those who heard them. And tonight, I will tell her story to my own child.`,
  },
  {
    id: "the-exam",
    title: "The Exam",
    character: "A student before a big exam",
    text: `Tomorrow is my exam. The biggest exam of my life. My books are open. My notes are everywhere. My head is full of formulas and dates. And my heart is full of fear. What if I forget everything? What if I fail? Then I remember what my teacher told me. She said, an exam is not a punishment. It is a chance to show what you have learned. You have studied. You have worked hard. You have done your part. Now go and do your best. So tomorrow, I will walk into that hall with my head high. I may not know every answer. But I know one thing. I am ready to try.`,
  },
  {
    id: "fishermans-son",
    title: "The Fisherman's Son",
    character: "A boy who wants to study",
    text: `My father is a fisherman. Every morning before the sun, he takes his boat into the sea. Every evening, he comes back tired, with fish and salt on his hands. He wants me to be a fisherman too. He says, the sea is our life. But father, I love the sea. I really do. But I also love books. When I read, I travel to places the sea cannot take me. I want to become a teacher. I want to teach the children of our village to read and write. So please, father, let me study. I promise you, I will never forget the sea. And one day, I will build a school right here, beside the water.`,
  },
];
