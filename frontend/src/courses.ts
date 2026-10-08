export type Language = 'yoruba'|'igbo'|'hausa';
export const courses = {
 yoruba:{name:'Yorùbá',greeting:'Ẹ káàbọ̀',meaning:'You are welcome',person:'Adé',color:'#cb774f',clothing:'Contemporary agbádá-inspired outfit and patterned fìlà',units:['Your first hello','Meet the family','Around the market'],lessons:['A warm welcome','Everyday greetings','Introduce yourself','A little conversation','Family connections','People we love','Market day','Everyday essentials']},
 igbo:{name:'Igbo',greeting:'Nnọọ',meaning:'Welcome',person:'Ada',color:'#8a6aab',clothing:'Contemporary blouse and patterned wrapper with coral-inspired accessories',units:['Begin with connection','Home & community','Out in the city'],lessons:['A warm welcome','How are you?','My name is…','Make a connection','At home','Our community','Finding your way','A day in town']},
 hausa:{name:'Hausa',greeting:'Sannu',meaning:'Hello',person:'Amina',color:'#458d98',clothing:'Contemporary long dress and matching headscarf with geometric embroidery',units:['Start a conversation','Friends & family','Everyday journeys'],lessons:['A warm welcome','Welcome a friend','Names & introductions','Keep talking','Our family','Visiting friends','On the move','Everyday places']}
};
export const lessonState=(i:number)=>i<2?'completed':i===2?'current':'locked';
